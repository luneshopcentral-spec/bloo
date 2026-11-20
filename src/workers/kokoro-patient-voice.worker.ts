import { KOKORO_DTYPE, KOKORO_MODEL_ID } from "@/lib/voice/kokoro-config";
import type {
  KokoroWorkerRequest,
  KokoroWorkerResponse,
} from "@/lib/voice/kokoro-worker-messages";

interface WorkerScope {
  onmessage: ((event: MessageEvent<KokoroWorkerRequest>) => void) | null;
  postMessage: (message: KokoroWorkerResponse) => void;
}

const workerScope = globalThis as unknown as WorkerScope;

interface KokoroAudio {
  toBlob: () => Blob;
}

interface KokoroModel {
  generate: (
    text: string,
    options: { voice: string; speed: number }
  ) => Promise<KokoroAudio>;
}

interface KokoroRuntime {
  env: { wasmPaths: string };
  KokoroTTS: {
    from_pretrained: (
      modelId: string,
      options: {
        dtype: typeof KOKORO_DTYPE;
        device: "wasm";
        progress_callback: typeof progressMessage;
      }
    ) => Promise<KokoroModel>;
  };
}

let runtimePromise: Promise<KokoroRuntime> | null = null;
let modelPromise: Promise<KokoroModel> | null = null;
let activeRequestId = "";
// One generation at a time, in order. Cancelled requests that have not
// started are skipped, so an interrupted reply never delays the next one.
let queue: Promise<void> = Promise.resolve();
const cancelled = new Set<string>();

function post(message: KokoroWorkerResponse) {
  workerScope.postMessage(message);
}

function progressMessage(info: { status?: string; progress?: number }) {
  const progress = Number.isFinite(info.progress) ? Math.round(info.progress as number) : null;
  post({
    type: "loading",
    requestId: activeRequestId,
    progress,
    message: progress === null
      ? "Preparing the patient voice…"
      : `Downloading the patient voice… ${progress}%`,
  });
}

function getRuntime(): Promise<KokoroRuntime> {
  if (!runtimePromise) {
    // The browser bundle is self-hosted next to its WASM files. Keeping this
    // import out of Webpack avoids pulling kokoro-js's native Node runtime into
    // the Next client build.
    const runtimeUrl = "/ort-kokoro/kokoro.web.js";
    runtimePromise = import(/* webpackIgnore: true */ runtimeUrl) as Promise<KokoroRuntime>;
  }
  return runtimePromise;
}

function getModel(): Promise<KokoroModel> {
  if (!modelPromise) {
    modelPromise = getRuntime().then((runtime) => {
      runtime.env.wasmPaths = "/ort-kokoro/";
      return runtime.KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
        dtype: KOKORO_DTYPE,
        device: "wasm",
        progress_callback: progressMessage,
      });
    }).catch((error: unknown) => {
      // A failed download can be tried again on a later request.
      modelPromise = null;
      runtimePromise = null;
      throw error;
    });
  }
  return modelPromise;
}

async function handle(request: Extract<KokoroWorkerRequest, { type: "synthesize" }>) {
  if (cancelled.delete(request.requestId)) return;
  activeRequestId = request.requestId;
  const model = await getModel();
  if (cancelled.delete(request.requestId)) return;
  post({
    type: "loading",
    requestId: request.requestId,
    progress: 100,
    message: "Generating the patient voice…",
  });
  const audio = await model.generate(request.text, {
    voice: request.voice,
    speed: 0.98,
  });
  // Cancelled mid-generation: nobody is waiting for it.
  if (cancelled.delete(request.requestId)) return;
  post({ type: "audio", requestId: request.requestId, audio: audio.toBlob() });
}

workerScope.onmessage = (event) => {
  const request = event.data;
  if (request.type === "cancel") {
    for (const requestId of request.requestIds) cancelled.add(requestId);
    return;
  }
  queue = queue.then(() => handle(request)).catch((error: unknown) => {
    post({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "Kokoro could not generate patient audio.",
    });
  });
};
