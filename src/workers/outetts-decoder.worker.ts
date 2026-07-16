import { env, PreTrainedModel, Tensor } from "@huggingface/transformers";
import { OUTETTS_DECODER_ID, OUTETTS_SAMPLE_RATE } from "@/lib/voice/outetts-config";
import type { OuteDecoderRequest, OuteDecoderResponse } from "@/lib/voice/outetts-decoder-messages";

// Load the ONNX WASM runtime from our own origin (public/ort, copied at build
// time) — the site's COOP/COEP headers block the default CDN download.
env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = "/ort/";
}

interface ProgressInfo {
  status: string;
  progress?: number;
  file?: string;
}

interface DecoderOutput {
  waveform: Tensor;
}

type Decoder = Awaited<ReturnType<typeof PreTrainedModel.from_pretrained>>;

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<OuteDecoderRequest>) => void) | null;
  postMessage: (message: OuteDecoderResponse, transfer?: Transferable[]) => void;
};

let decoderPromise: Promise<Decoder> | null = null;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getDecoder(): Promise<Decoder> {
  decoderPromise ??= (async () => {
    workerScope.postMessage({ type: "loading" });
    const decoder = await PreTrainedModel.from_pretrained(OUTETTS_DECODER_ID, {
      device: "wasm",
      dtype: "q8",
      progress_callback: (progress: ProgressInfo) => {
        if (progress.status !== "progress" || typeof progress.progress !== "number") return;
        workerScope.postMessage({
          type: "progress",
          progress: progress.progress,
          file: progress.file,
        });
      },
    });
    workerScope.postMessage({ type: "ready" });
    return decoder;
  })();
  return decoderPromise;
}

async function decode(request: Extract<OuteDecoderRequest, { type: "decode" }>) {
  try {
    const decoder = await getDecoder();
    const values = BigInt64Array.from(request.codes, (code) => BigInt(code));
    const result = await decoder({
      codes: new Tensor("int64", values, [1, values.length]),
    }) as DecoderOutput;
    const samples = Float32Array.from(result.waveform.data as Float32Array);
    workerScope.postMessage({
      type: "audio",
      requestId: request.requestId,
      samples: samples.buffer,
      samplingRate: OUTETTS_SAMPLE_RATE,
    }, [samples.buffer]);
  } catch (error) {
    workerScope.postMessage({ type: "error", requestId: request.requestId, message: errorText(error) });
  }
}

workerScope.onmessage = (event) => {
  if (event.data.type === "prepare") {
    void getDecoder().catch((error) => {
      workerScope.postMessage({ type: "error", message: errorText(error) });
    });
    return;
  }
  void decode(event.data);
};
