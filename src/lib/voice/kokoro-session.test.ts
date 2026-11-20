import { afterEach, describe, expect, it, vi } from "vitest";
import { KokoroSession, PatientSpeechInterrupted, speechChunks, type VoiceWorker } from "./kokoro-session";
import type { KokoroWorkerRequest, KokoroWorkerResponse } from "./kokoro-worker-messages";

class FakeWorker implements VoiceWorker {
  sent: KokoroWorkerRequest[] = [];
  terminated = false;
  onmessage: ((event: MessageEvent<KokoroWorkerResponse>) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  postMessage(message: KokoroWorkerRequest) { this.sent.push(message); }
  terminate() { this.terminated = true; }
  reply(message: KokoroWorkerResponse) { this.onmessage?.({ data: message } as MessageEvent<KokoroWorkerResponse>); }
  lastRequestId() {
    const last = [...this.sent].reverse().find((message) => message.type === "synthesize");
    return last && last.type === "synthesize" ? last.requestId : "";
  }
}

function setup(limits = { loadStallMs: 1_000, generationStallMs: 500 }) {
  const workers: FakeWorker[] = [];
  const progress: Array<number | null> = [];
  const session = new KokoroSession(() => {
    const worker = new FakeWorker();
    workers.push(worker);
    return worker;
  }, (value) => progress.push(value), limits);
  return { session, workers, progress };
}

afterEach(() => vi.useRealTimers());

describe("patient voice session", () => {
  it("keeps the model loaded when a reply is interrupted", async () => {
    const { session, workers } = setup();
    const first = session.synthesize("Hello there.", "bm_george");
    session.cancel();
    await expect(first).rejects.toBeInstanceOf(PatientSpeechInterrupted);
    expect(workers[0].terminated).toBe(false);
    expect(workers[0].sent.at(-1)).toEqual({ type: "cancel", requestIds: [expect.any(String)] });
    // The next reply reuses the same worker: no second model load.
    session.synthesize("Okay.", "bm_george").catch(() => undefined);
    expect(workers).toHaveLength(1);
  });

  it("replays a clip from memory without generating it again", async () => {
    const { session, workers } = setup();
    const audio = new Blob(["wav"], { type: "audio/wav" });
    const first = session.synthesize("Yes, penicillin.", "bm_george");
    workers[0].reply({ type: "audio", requestId: workers[0].lastRequestId(), audio });
    await expect(first).resolves.toBe(audio);
    const sentBefore = workers[0].sent.length;
    await expect(session.synthesize("Yes, penicillin.", "bm_george")).resolves.toBe(audio);
    expect(workers[0].sent.length).toBe(sentBefore);
    expect(session.ready).toBe(true);
  });

  it("reports download progress only while the model is loading", async () => {
    const { session, workers, progress } = setup();
    const first = session.synthesize("One.", "bf_emma");
    workers[0].reply({ type: "loading", requestId: workers[0].lastRequestId(), progress: 40, message: "" });
    workers[0].reply({ type: "audio", requestId: workers[0].lastRequestId(), audio: new Blob(["a"]) });
    await first;
    const second = session.synthesize("Two.", "bf_emma");
    workers[0].reply({ type: "loading", requestId: workers[0].lastRequestId(), progress: 100, message: "" });
    workers[0].reply({ type: "audio", requestId: workers[0].lastRequestId(), audio: new Blob(["b"]) });
    await second;
    expect(progress).toEqual([40]);
  });

  it("gives up on a stalled download instead of waiting forever", async () => {
    vi.useFakeTimers();
    const { session, workers } = setup();
    const clip = session.synthesize("Hello.", "bf_emma");
    const outcome = expect(clip).rejects.toThrow(/stalled/);
    vi.advanceTimersByTime(1_001);
    await outcome;
    expect(workers[0].terminated).toBe(true);
  });

  it("keeps waiting while the download is still making progress", async () => {
    vi.useFakeTimers();
    const { session, workers } = setup();
    const clip = session.synthesize("Hello.", "bf_emma");
    for (let step = 0; step < 5; step += 1) {
      vi.advanceTimersByTime(900);
      workers[0].reply({ type: "loading", requestId: workers[0].lastRequestId(), progress: step * 20, message: "" });
    }
    workers[0].reply({ type: "audio", requestId: workers[0].lastRequestId(), audio: new Blob(["a"]) });
    await expect(clip).resolves.toBeInstanceOf(Blob);
  });

  it("passes on a generation error", async () => {
    const { session, workers } = setup();
    const clip = session.synthesize("Hello.", "bf_emma");
    workers[0].reply({ type: "error", requestId: workers[0].lastRequestId(), message: "no WebAssembly" });
    await expect(clip).rejects.toThrow("no WebAssembly");
  });
});

describe("speech chunks", () => {
  it("speaks a reply sentence by sentence", () => {
    expect(speechChunks("Yes, penicillin — I got a rash when I took it. So is my repeat ready for me to take home today?"))
      .toEqual(["Yes, penicillin — I got a rash when I took it.", "So is my repeat ready for me to take home today?"]);
  });

  it("splits a long sentence after a short lead-in, then at its first comma", () => {
    expect(speechChunks("Okay — it might make me feel a bit sick, I should take it on an empty stomach and I’ll let you know if it’s a problem."))
      .toEqual(["Okay —", "it might make me feel a bit sick,", "I should take it on an empty stomach and I’ll let you know if it’s a problem."]);
    expect(speechChunks("It might make me feel a bit sick, I should take it on an empty stomach and I’ll let you know if it’s a problem."))
      .toEqual(["It might make me feel a bit sick,", "I should take it on an empty stomach and I’ll let you know if it’s a problem."]);
  });

  it("does not break a list across pieces", () => {
    expect(speechChunks("I’ll check before taking ibuprofen, aspirin or other anti-inflammatories with my warfarin."))
      .toEqual(["I’ll check before taking ibuprofen, aspirin or other anti-inflammatories with my warfarin."]);
  });

  it("never leaves a piece too short to sound natural", () => {
    expect(speechChunks("Yes, I keep the clinic's dosing sheet on the fridge and stick to it every single week without fail."))
      .toEqual(["Yes, I keep the clinic's dosing sheet on the fridge and stick to it every single week without fail."]);
  });

  it("keeps decimals, abbreviations and short sentences whole", () => {
    expect(speechChunks("My old box was 2.5 milligrams.")).toEqual(["My old box was 2.5 milligrams."]);
    expect(speechChunks("Dr. Smith said so. Okay.")).toEqual(["Dr. Smith said so.", "Okay."]);
    expect(speechChunks("Hi Sam, nice to meet you.")).toEqual(["Hi Sam, nice to meet you."]);
  });
});
