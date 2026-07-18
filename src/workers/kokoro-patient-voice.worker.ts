import { KOKORO_MODEL_ID } from "@/lib/voice/kokoro-config";
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
        dtype: "q8";
        device: "wasm";
        progress_callback: typeof progressMessage;
      }
    ) => Promise<KokoroModel>;
  };
}

let runtimePromise: Promise<KokoroRuntime> | null = null;
let modelPromise: Promise<KokoroModel> | null = null;
let activeRequestId = "";

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
      ? "Preparing Kokoro safety voice…"
      : `Downloading Kokoro safety voice… ${progress}%`,
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
        dtype: "q8",
        device: "wasm",
        progress_callback: progressMessage,
      });
    });
  }
  return modelPromise;
}

async function synthesize(request: KokoroWorkerRequest) {
  activeRequestId = request.requestId;
  const model = await getModel();
  post({
    type: "loading",
    requestId: request.requestId,
    progress: 100,
    message: "Generating the local safety voice…",
  });
  const audio = await model.generate(request.text, {
    voice: request.voice,
    speed: 0.98,
  });
  post({ type: "audio", requestId: request.requestId, audio: audio.toBlob() });
}

workerScope.onmessage = (event) => {
  const request = event.data;
  synthesize(request).catch((error: unknown) => {
    post({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "Kokoro could not generate patient audio.",
    });
  });
};
