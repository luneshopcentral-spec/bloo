"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoggerWithoutDebug, Wllama } from "@wllama/wllama/esm/index.js";
import {
  buildOutePrompt,
  estimateOuteMaxTokens,
  extractOuteAudioCodes,
  extractOuteAudioCodesFromTokenIds,
  getOuteVoiceProfile,
  OUTETTS_MODEL_FILE,
  OUTETTS_MODEL_REPO,
  OUTETTS_SAMPLE_RATE,
  splitOuteSpeech,
} from "@/lib/voice/outetts-config";
import type { OuteDecoderRequest, OuteDecoderResponse } from "@/lib/voice/outetts-decoder-messages";

export type OuteActivity = "idle" | "loading" | "generating" | "speaking";
export type PatientVoiceEngine = "outetts" | "system";
export type OuteBackend = "webgpu+wasm" | "wasm";

interface UseOutePatientVoiceOptions {
  patientKey: string;
  onActivity: (activity: OuteActivity) => void;
  onFallback: (text: string, reason: string) => void;
}

interface DecodeResolver {
  resolve: (audio: Float32Array) => void;
  reject: (error: Error) => void;
}

interface ReadyResolver {
  resolve: () => void;
  reject: (error: Error) => void;
}

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

interface CompletionLogprobs {
  tokens?: unknown;
  content?: Array<{ id?: unknown; token?: unknown }>;
}

const MODEL_PROGRESS_WEIGHT = 0.79;
const DECODER_PROGRESS_WEIGHT = 0.21;
const SILENCE_SECONDS = 0.12;
const GENERATION_TIMEOUT_MS = 120_000;
const AUDIO_RESUME_TIMEOUT_MS = 2_000;

function friendlyOuteError(message: string): string {
  if (/memory|allocation|out of memory|array buffer/i.test(message)) {
    return "the laptop did not have enough available memory for the local OuteTTS model";
  }
  if (/webgpu|gpu|adapter/i.test(message)) {
    return "WebGPU could not start and the local WASM fallback was unavailable";
  }
  if (/webassembly|wasm|jspi|memory64|compat/i.test(message)) {
    return "this browser could not initialise the local OuteTTS compatibility runtime";
  }
  if (/fetch|network|download|failed to load|huggingface/i.test(message)) {
    return "the OuteTTS model or audio decoder could not be downloaded";
  }
  if (/audio tokens|waveform|decoder/i.test(message)) {
    return "OuteTTS did not produce a playable patient reply";
  }
  if (/audio playback|blocked/i.test(message)) {
    return "the browser blocked local audio playback";
  }
  if (/timed out/i.test(message)) {
    return "OuteTTS took too long to generate on this laptop";
  }
  return "the local OuteTTS voice could not start";
}

function concatenateAudio(parts: Float32Array[]): Float32Array {
  if (parts.length === 1) return parts[0];
  const silence = new Float32Array(Math.round(OUTETTS_SAMPLE_RATE * SILENCE_SECONDS));
  const length = parts.reduce((total, part) => total + part.length, 0)
    + silence.length * Math.max(0, parts.length - 1);
  const output = new Float32Array(length);
  let offset = 0;
  parts.forEach((part, index) => {
    output.set(part, offset);
    offset += part.length;
    if (index < parts.length - 1) offset += silence.length;
  });
  return output;
}

function getCompletionTokenStrings(logprobs: unknown): string[] {
  if (!logprobs || typeof logprobs !== "object") return [];
  const value = logprobs as CompletionLogprobs;
  if (Array.isArray(value.tokens)) {
    return value.tokens.filter((token): token is string => typeof token === "string");
  }
  if (Array.isArray(value.content)) {
    return value.content
      .map((entry) => entry?.token)
      .filter((token): token is string => typeof token === "string");
  }
  return [];
}

function getCompletionTokenIds(logprobs: unknown): number[] {
  if (!logprobs || typeof logprobs !== "object") return [];
  const value = logprobs as CompletionLogprobs;
  if (!Array.isArray(value.content)) return [];
  return value.content
    .map((entry) => entry?.id)
    .filter((tokenId): tokenId is number => typeof tokenId === "number");
}

export function useOutePatientVoice({
  patientKey,
  onActivity,
  onFallback,
}: UseOutePatientVoiceOptions) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [engine, setEngine] = useState<PatientVoiceEngine>("outetts");
  const [backend, setBackend] = useState<OuteBackend | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const wllamaRef = useRef<Wllama | null>(null);
  const runtimePromiseRef = useRef<Promise<Wllama> | null>(null);
  const decoderWorkerRef = useRef<Worker | null>(null);
  const decoderReadyPromiseRef = useRef<Promise<void> | null>(null);
  const decoderReadyResolverRef = useRef<ReadyResolver | null>(null);
  const decodeResolversRef = useRef(new Map<string, DecodeResolver>());
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const pendingTextRef = useRef("");
  const failedReasonRef = useRef<string | null>(null);
  const modelProgressRef = useRef(0);
  const decoderProgressRef = useRef(0);
  const activityCallbackRef = useRef(onActivity);
  const fallbackCallbackRef = useRef(onFallback);

  const updateProgress = useCallback(() => {
    const combined = modelProgressRef.current * MODEL_PROGRESS_WEIGHT
      + decoderProgressRef.current * DECODER_PROGRESS_WEIGHT;
    setProgress(Math.max(0, Math.min(100, combined)));
  }, []);

  useEffect(() => {
    activityCallbackRef.current = onActivity;
  }, [onActivity]);

  useEffect(() => {
    fallbackCallbackRef.current = onFallback;
  }, [onFallback]);

  const updateActivity = useCallback((activity: OuteActivity) => {
    activityCallbackRef.current(activity);
  }, []);

  const fallback = useCallback((message: string) => {
    console.error("OuteTTS patient voice failed:", message);
    const text = pendingTextRef.current;
    const reason = friendlyOuteError(message);
    setDiagnostic(message.slice(0, 240));
    failedReasonRef.current = reason;
    requestIdRef.current = null;
    setEngine("system");
    updateActivity("idle");
    if (text) fallbackCallbackRef.current(text, reason);
  }, [updateActivity]);

  const ensureDecoderWorker = useCallback((): Worker => {
    if (decoderWorkerRef.current) return decoderWorkerRef.current;
    const worker = new Worker(new URL("../workers/outetts-decoder.worker.ts", import.meta.url), {
      type: "module",
      name: "outetts-audio-decoder",
    });
    worker.onmessage = (event: MessageEvent<OuteDecoderResponse>) => {
      const message = event.data;
      if (message.type === "loading") {
        decoderProgressRef.current = 0;
        updateProgress();
      } else if (message.type === "progress") {
        decoderProgressRef.current = message.progress;
        updateProgress();
      } else if (message.type === "ready") {
        decoderProgressRef.current = 100;
        updateProgress();
        decoderReadyResolverRef.current?.resolve();
        decoderReadyResolverRef.current = null;
      } else if (message.type === "audio") {
        const resolver = decodeResolversRef.current.get(message.requestId);
        if (!resolver) return;
        decodeResolversRef.current.delete(message.requestId);
        resolver.resolve(new Float32Array(message.samples));
      } else if (message.type === "error") {
        const error = new Error(message.message);
        if (message.requestId) {
          const resolver = decodeResolversRef.current.get(message.requestId);
          decodeResolversRef.current.delete(message.requestId);
          resolver?.reject(error);
        } else {
          decoderReadyResolverRef.current?.reject(error);
          decoderReadyResolverRef.current = null;
        }
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      const error = new Error(event.message || "The OuteTTS decoder stopped unexpectedly.");
      decoderReadyResolverRef.current?.reject(error);
      decoderReadyResolverRef.current = null;
      for (const resolver of decodeResolversRef.current.values()) resolver.reject(error);
      decodeResolversRef.current.clear();
    };
    decoderWorkerRef.current = worker;
    return worker;
  }, [updateProgress]);

  const prepareDecoder = useCallback((): Promise<void> => {
    if (decoderReadyPromiseRef.current) return decoderReadyPromiseRef.current;
    decoderReadyPromiseRef.current = new Promise<void>((resolve, reject) => {
      decoderReadyResolverRef.current = {
        resolve: () => resolve(),
        reject,
      };
      const request: OuteDecoderRequest = { type: "prepare" };
      ensureDecoderWorker().postMessage(request);
    });
    return decoderReadyPromiseRef.current;
  }, [ensureDecoderWorker]);

  const decode = useCallback((codes: number[], requestId: string): Promise<Float32Array> => (
    new Promise<Float32Array>((resolve, reject) => {
      decodeResolversRef.current.set(requestId, { resolve, reject });
      const request: OuteDecoderRequest = { type: "decode", requestId, codes };
      ensureDecoderWorker().postMessage(request);
    })
  ), [ensureDecoderWorker]);

  const ensureRuntime = useCallback((): Promise<Wllama> => {
    if (runtimePromiseRef.current) return runtimePromiseRef.current;
    runtimePromiseRef.current = (async () => {
      updateActivity("loading");
      setProgress(0);
      const wasmUrl = new URL(
        "../../node_modules/@wllama/wllama/esm/wasm/wllama.wasm",
        import.meta.url
      ).href;
      const compatWasmUrl = new URL(
        "../../node_modules/@wllama/wllama-compat/wasm/wllama.wasm",
        import.meta.url
      ).href;
      const compatWorkerUrl = new URL(
        "../../node_modules/@wllama/wllama-compat/wasm/wllama.js",
        import.meta.url
      ).href;

      const createRuntime = () => {
        const runtime = new Wllama(
          { default: wasmUrl },
          { allowOffline: true, logger: LoggerWithoutDebug, suppressNativeLog: true }
        );
        runtime.setCompat({ wasm: compatWasmUrl, worker: compatWorkerUrl });
        return runtime;
      };

      const loadRuntime = async (runtime: Wllama, useWebGpu: boolean) => {
        setBackend(useWebGpu ? "webgpu+wasm" : "wasm");
        wllamaRef.current = runtime;
        await runtime.loadModelFromHF(
          { repo: OUTETTS_MODEL_REPO, file: OUTETTS_MODEL_FILE },
          {
            n_ctx: 4_096,
            n_threads: Math.max(1, Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2))),
            n_gpu_layers: useWebGpu ? 99_999 : 0,
            progressCallback: ({ loaded, total }) => {
              modelProgressRef.current = total > 0 ? (loaded / total) * 100 : 0;
              updateProgress();
            },
          }
        );
        return runtime;
      };

      const decoderPromise = prepareDecoder();
      let runtime = createRuntime();
      const webgpu = runtime.isSupportWebGPU();
      try {
        runtime = await loadRuntime(runtime, webgpu);
      } catch (error) {
        if (!webgpu) throw error;
        console.warn("OuteTTS WebGPU initialisation failed; retrying with WASM.", error);
        try {
          await runtime.exit();
        } catch {
          // The failed WebGPU runtime may already be closed.
        }
        modelProgressRef.current = 0;
        updateProgress();
        runtime = await loadRuntime(createRuntime(), false);
      }
      await decoderPromise;

      modelProgressRef.current = 100;
      decoderProgressRef.current = 100;
      updateProgress();
      setModelReady(true);
      setEngine("outetts");
      return runtime;
    })().catch((error) => {
      runtimePromiseRef.current = null;
      throw error;
    });
    return runtimePromiseRef.current;
  }, [prepareDecoder, updateActivity, updateProgress]);

  const playAudio = useCallback(async (samples: Float32Array, requestId: string) => {
    if (requestId !== requestIdRef.current) return;
    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("audio playback is unavailable in this browser");
    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    if (context.state === "suspended") {
      let resumeTimeout: number | null = null;
      try {
        await Promise.race([
          context.resume(),
          new Promise<never>((_resolve, reject) => {
            resumeTimeout = window.setTimeout(
              () => reject(new Error("The browser blocked local audio playback.")),
              AUDIO_RESUME_TIMEOUT_MS
            );
          }),
        ]);
      } finally {
        if (resumeTimeout !== null) window.clearTimeout(resumeTimeout);
      }
    }
    if (context.state !== "running") throw new Error("The browser blocked local audio playback.");
    const audioBuffer = context.createBuffer(1, samples.length, OUTETTS_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(samples);
    sourceRef.current?.stop();
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    source.onended = () => {
      if (sourceRef.current !== source) return;
      sourceRef.current = null;
      requestIdRef.current = null;
      updateActivity("idle");
    };
    sourceRef.current = source;
    setEngine("outetts");
    updateActivity("speaking");
    source.start();
  }, [updateActivity]);

  const primeAudioContext = useCallback(() => {
    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("audio playback is unavailable in this browser");
    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    if (context.state === "suspended") {
      void context.resume().catch(() => {
        // playAudio will report a useful fallback if playback is still blocked later.
      });
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    requestIdRef.current = null;
    pendingTextRef.current = "";
    sourceRef.current?.stop();
    sourceRef.current = null;
    updateActivity("idle");
  }, [updateActivity]);

  const speak = useCallback((text: string) => {
    cancel();
    pendingTextRef.current = text;
    if (failedReasonRef.current) {
      fallbackCallbackRef.current(text, failedReasonRef.current);
      return;
    }

    try {
      primeAudioContext();
    } catch (error) {
      fallback(error instanceof Error ? error.message : String(error));
      return;
    }

    const requestId = crypto.randomUUID();
    const abortController = new AbortController();
    requestIdRef.current = requestId;
    abortRef.current = abortController;
    setDiagnostic(null);
    setEngine("outetts");
    updateActivity(modelReady ? "generating" : "loading");

    void (async () => {
      let generationTimeout: number | null = null;
      let generationTimedOut = false;
      try {
        const runtime = await ensureRuntime();
        if (requestIdRef.current !== requestId || abortController.signal.aborted) return;
        updateActivity("generating");
        generationTimeout = window.setTimeout(() => {
          generationTimedOut = true;
          abortController.abort("OuteTTS generation timed out.");
        }, GENERATION_TIMEOUT_MS);
        const profile = getOuteVoiceProfile(patientKey);
        const audioParts: Float32Array[] = [];
        const chunks = splitOuteSpeech(text);

        for (let index = 0; index < chunks.length; index += 1) {
          if (requestIdRef.current !== requestId || abortController.signal.aborted) return;
          const chunk = chunks[index];
          const response = await runtime.createCompletion({
            prompt: buildOutePrompt(chunk, profile.speaker),
            max_tokens: estimateOuteMaxTokens(chunk),
            temp: 0.1,
            top_k: 40,
            top_p: 0.9,
            penalty_repeat: 1.1,
            penalty_last_n: 64,
            seed: profile.seed + index,
            stop: ["<|audio_end|>", "<|im_end|>"],
            logprobs: 1,
            abortSignal: abortController.signal,
          });
          const choice = response.choices[0];
          if (!choice) throw new Error("OuteTTS returned no completion response.");
          const tokenStrings = getCompletionTokenStrings(choice.logprobs);
          const generated = tokenStrings.join("") || choice.text;
          const textCodes = extractOuteAudioCodes(generated);
          const codes = textCodes.length > 0
            ? textCodes
            : extractOuteAudioCodesFromTokenIds(getCompletionTokenIds(choice.logprobs));
          if (codes.length === 0) {
            throw new Error("OuteTTS returned no audio tokens.");
          }
          const decoded = await decode(codes, `${requestId}-${index}`);
          audioParts.push(decoded);
        }

        if (requestIdRef.current !== requestId || abortController.signal.aborted) return;
        await playAudio(concatenateAudio(audioParts), requestId);
      } catch (error) {
        if (abortController.signal.aborted && !generationTimedOut) return;
        fallback(generationTimedOut
          ? "OuteTTS generation timed out."
          : error instanceof Error ? error.message : String(error));
      } finally {
        if (generationTimeout !== null) window.clearTimeout(generationTimeout);
      }
    })();
  }, [cancel, decode, ensureRuntime, fallback, modelReady, patientKey, playAudio, primeAudioContext, updateActivity]);

  useEffect(() => {
    const audioWindow = window as AudioWindow;
    const decodeResolvers = decodeResolversRef.current;
    setSupported(Boolean(window.Worker && (window.AudioContext || audioWindow.webkitAudioContext)));
    return () => {
      abortRef.current?.abort();
      sourceRef.current?.stop();
      decoderWorkerRef.current?.terminate();
      decoderWorkerRef.current = null;
      for (const resolver of decodeResolvers.values()) {
        resolver.reject(new Error("OuteTTS voice closed."));
      }
      decodeResolvers.clear();
      void wllamaRef.current?.exit();
      wllamaRef.current = null;
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  return {
    supported,
    engine,
    backend,
    quantization: "Q4_K_M + q8 decoder" as const,
    progress,
    modelReady,
    diagnostic,
    profile: getOuteVoiceProfile(patientKey),
    speak,
    cancel,
  };
}
