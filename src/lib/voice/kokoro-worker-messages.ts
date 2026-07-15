import type { KokoroVoiceId } from "./kokoro-config";

export type KokoroBackend = "webgpu" | "wasm";
export type KokoroDType = "fp32" | "q8";

export type KokoroWorkerRequest =
  | {
      type: "synthesize";
      requestId: string;
      text: string;
      voice: KokoroVoiceId;
      speed: number;
    }
  | {
      type: "cancel";
      requestId: string;
    };

export type KokoroWorkerResponse =
  | {
      type: "loading";
      backend: KokoroBackend;
      dtype: KokoroDType;
    }
  | {
      type: "progress";
      backend: KokoroBackend;
      dtype: KokoroDType;
      progress: number;
      file?: string;
    }
  | {
      type: "ready";
      backend: KokoroBackend;
      dtype: KokoroDType;
    }
  | {
      type: "generating";
      requestId: string;
    }
  | {
      type: "audio";
      requestId: string;
      samples: ArrayBuffer;
      samplingRate: number;
    }
  | {
      type: "error";
      requestId: string;
      message: string;
    };
