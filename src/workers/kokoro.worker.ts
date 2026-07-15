import { KOKORO_MODEL_ID } from "@/lib/voice/kokoro-config";
import type {
  KokoroBackend,
  KokoroDType,
  KokoroWorkerRequest,
  KokoroWorkerResponse,
} from "@/lib/voice/kokoro-worker-messages";

interface ProgressInfo {
  status: string;
  progress?: number;
  file?: string;
}

interface WorkerScope {
  navigator: Navigator;
  onmessage: ((event: MessageEvent<KokoroWorkerRequest>) => void) | null;
  postMessage: (message: KokoroWorkerResponse, transfer?: Transferable[]) => void;
}

interface LoadedModel {
  tts: KokoroInstance;
  backend: KokoroBackend;
  dtype: KokoroDType;
}

type KokoroRuntime = typeof import("kokoro-js");
type KokoroInstance = Awaited<ReturnType<KokoroRuntime["KokoroTTS"]["from_pretrained"]>>;

const kokoroRuntimeUrl = new URL(
  "../../node_modules/kokoro-js/dist/kokoro.web.js",
  import.meta.url
);

const workerScope = self as unknown as WorkerScope;
const cancelledRequests = new Set<string>();
const pendingRequests = new Set<string>();
let modelPromise: Promise<LoadedModel> | null = null;
let runtimePromise: Promise<KokoroRuntime> | null = null;
let synthesisQueue = Promise.resolve();

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getRuntime(): Promise<KokoroRuntime> {
  // Import the published browser bundle as an emitted static asset. If Next parses this
  // file, it rewrites ONNX Runtime's dynamic WASM helper import and breaks at runtime.
  runtimePromise ??= import(/* webpackIgnore: true */ kokoroRuntimeUrl.href) as Promise<KokoroRuntime>;
  return runtimePromise;
}

async function createModel(): Promise<LoadedModel> {
  const { KokoroTTS } = await getRuntime();
  const attempts: Array<{ backend: KokoroBackend; dtype: KokoroDType }> = [];
  if ("gpu" in workerScope.navigator) {
    attempts.push({ backend: "webgpu", dtype: "fp32" });
  }
  attempts.push({ backend: "wasm", dtype: "q8" });

  let finalError: unknown = new Error("No compatible Kokoro backend is available.");
  for (const attempt of attempts) {
    workerScope.postMessage({ type: "loading", ...attempt });
    try {
      const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
        device: attempt.backend,
        dtype: attempt.dtype,
        progress_callback: (progressInfo: ProgressInfo) => {
          if (progressInfo.status !== "progress" || typeof progressInfo.progress !== "number") return;
          workerScope.postMessage({
            type: "progress",
            ...attempt,
            progress: progressInfo.progress,
            file: progressInfo.file,
          });
        },
      });
      workerScope.postMessage({ type: "ready", ...attempt });
      return { tts, ...attempt };
    } catch (error) {
      finalError = error;
    }
  }

  throw finalError;
}

function getModel(): Promise<LoadedModel> {
  modelPromise ??= createModel();
  return modelPromise;
}

async function synthesize(request: Extract<KokoroWorkerRequest, { type: "synthesize" }>) {
  try {
    if (cancelledRequests.delete(request.requestId)) return;
    const model = await getModel();
    if (cancelledRequests.delete(request.requestId)) return;

    workerScope.postMessage({ type: "generating", requestId: request.requestId });
    const audio = await model.tts.generate(request.text, {
      voice: request.voice,
      speed: request.speed,
    });
    if (cancelledRequests.delete(request.requestId)) return;

    const samples = Float32Array.from(audio.audio);
    const response: KokoroWorkerResponse = {
      type: "audio",
      requestId: request.requestId,
      samples: samples.buffer,
      samplingRate: audio.sampling_rate,
    };
    workerScope.postMessage(response, [samples.buffer]);
  } catch (error) {
    if (cancelledRequests.delete(request.requestId)) return;
    workerScope.postMessage({
      type: "error",
      requestId: request.requestId,
      message: errorText(error),
    });
  } finally {
    pendingRequests.delete(request.requestId);
    cancelledRequests.delete(request.requestId);
  }
}

workerScope.onmessage = (event) => {
  const request = event.data;
  if (request.type === "cancel") {
    if (pendingRequests.has(request.requestId)) cancelledRequests.add(request.requestId);
    return;
  }
  pendingRequests.add(request.requestId);
  synthesisQueue = synthesisQueue.then(() => synthesize(request));
};
