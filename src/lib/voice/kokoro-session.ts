import type { KokoroWorkerRequest, KokoroWorkerResponse } from "./kokoro-worker-messages";

export interface VoiceWorker {
  postMessage(message: KokoroWorkerRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<KokoroWorkerResponse>) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
}

interface Pending {
  resolve: (audio: Blob) => void;
  reject: (error: Error) => void;
}

/** No download progress for this long while loading means the download is stuck. */
export const KOKORO_LOAD_STALL_MS = 120_000;
/** Once loaded, the worker answering nothing for this long means it has hung. */
export const KOKORO_GENERATION_STALL_MS = 45_000;

const CACHE_ITEMS = 40;
const CACHE_BYTES = 12_000_000;

export class PatientSpeechInterrupted extends Error {
  constructor() {
    super("Patient speech was interrupted.");
  }
}

/**
 * The patient's voice model, kept loaded for the whole consultation. Stopping
 * or interrupting a reply drops its queued sentences but never unloads the
 * model, so the next reply does not pay the load again. Generated clips are
 * kept for the session, so replaying the patient is instant.
 */
export class KokoroSession {
  private worker: VoiceWorker | null = null;
  private pending = new Map<string, Pending>();
  private cache = new Map<string, Blob>();
  private cacheBytes = 0;
  private loaded = false;
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly createWorker: () => VoiceWorker,
    private readonly onProgress: (progress: number | null) => void,
    private readonly limits = { loadStallMs: KOKORO_LOAD_STALL_MS, generationStallMs: KOKORO_GENERATION_STALL_MS },
  ) {}

  /** The model has produced audio in this session, so the next clip needs no download. */
  get ready(): boolean {
    return this.loaded;
  }

  synthesize(text: string, voice: string): Promise<Blob> {
    const key = `${voice}\u0000${text}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return Promise.resolve(cached);
    }
    return new Promise<Blob>((resolve, reject) => {
      const requestId = crypto.randomUUID();
      this.pending.set(requestId, {
        resolve: (audio) => {
          this.remember(key, audio);
          resolve(audio);
        },
        reject,
      });
      try {
        this.getWorker().postMessage({ type: "synthesize", requestId, text, voice });
        this.armWatchdog();
      } catch (error) {
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error("The patient voice could not start."));
      }
    });
  }

  /** Stop waiting for every queued clip. The model stays loaded. */
  cancel(): void {
    if (!this.pending.size) return;
    const requestIds = [...this.pending.keys()];
    for (const pending of this.pending.values()) pending.reject(new PatientSpeechInterrupted());
    this.pending.clear();
    this.clearWatchdog();
    this.worker?.postMessage({ type: "cancel", requestIds });
  }

  dispose(error: Error = new Error("The patient voice was closed.")): void {
    this.clearWatchdog();
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
    }
    this.worker = null;
    this.loaded = false;
  }

  private getWorker(): VoiceWorker {
    if (this.worker) return this.worker;
    const worker = this.createWorker();
    worker.onmessage = ({ data }) => {
      const pending = this.pending.get(data.requestId);
      // An interrupted reply cannot affect the current one.
      if (!pending) return;
      this.armWatchdog();
      if (data.type === "loading") {
        if (!this.loaded) this.onProgress(data.progress);
        return;
      }
      this.pending.delete(data.requestId);
      if (!this.pending.size) this.clearWatchdog();
      if (data.type === "error") {
        pending.reject(new Error(data.message));
        return;
      }
      this.loaded = true;
      pending.resolve(data.audio);
    };
    worker.onerror = (event) => this.dispose(new Error(event.message || "The patient voice stopped unexpectedly."));
    this.worker = worker;
    return worker;
  }

  private armWatchdog(): void {
    this.clearWatchdog();
    const limit = this.loaded ? this.limits.generationStallMs : this.limits.loadStallMs;
    this.watchdog = setTimeout(() => {
      this.dispose(new Error(this.loaded
        ? "The patient voice stopped responding."
        : "The patient voice download stalled."));
    }, limit);
  }

  private clearWatchdog(): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
  }

  private remember(key: string, audio: Blob): void {
    if (audio.size > CACHE_BYTES) return;
    while (this.cache.size >= CACHE_ITEMS || this.cacheBytes + audio.size > CACHE_BYTES) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cacheBytes -= this.cache.get(oldest)!.size;
      this.cache.delete(oldest);
    }
    this.cache.set(key, audio);
    this.cacheBytes += audio.size;
  }
}

const ABBREVIATION = /\b(?:Dr|Mr|Mrs|Ms|St|No)\.$/;

/**
 * A long sentence splits after a short lead-in ("Okay — …"), or else at its
 * first comma, so the patient starts talking sooner. Each piece keeps at
 * least four words, so the intonation stays natural.
 */
function splitLongSentence(sentence: string): string[] {
  if (sentence.length <= 80) return [sentence];
  const dash = sentence.indexOf(" — ");
  if (dash > 0) {
    const head = sentence.slice(0, dash + 2).trim();
    const tail = sentence.slice(dash + 3).trim();
    if (head.split(/\s+/).length <= 6 && tail) return [head, ...splitLongSentence(tail)];
  }
  const comma = sentence.indexOf(", ");
  if (comma > 0) {
    const head = sentence.slice(0, comma + 1);
    const tail = sentence.slice(comma + 2).trim();
    const headWords = head.split(/\s+/).length;
    const tailWords = tail.split(/\s+/);
    // "ibuprofen, aspirin or other…" is one list, not two thoughts.
    const continuesList = tailWords.slice(1, 4).some((word) => /^(?:or|and)$/i.test(word));
    if (headWords >= 4 && headWords <= 12 && tailWords.length >= 4 && !continuesList) return [head, tail];
  }
  return [sentence];
}

/**
 * Split a patient line into the pieces the voice generates one at a time, so
 * the patient starts talking after the first piece rather than the whole reply.
 */
export function speechChunks(text: string): string[] {
  const sentences: string[] = [];
  let current = "";
  for (const part of text.trim().split(/(?<=[.!?…])\s+/)) {
    current = current ? `${current} ${part}` : part;
    if (!ABBREVIATION.test(current)) {
      sentences.push(current);
      current = "";
    }
  }
  if (current) sentences.push(current);
  return sentences.flatMap(splitLongSentence).filter(Boolean);
}
