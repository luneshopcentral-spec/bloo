export type OuteDecoderRequest =
  | { type: "prepare" }
  | { type: "decode"; requestId: string; codes: number[] };

export type OuteDecoderResponse =
  | { type: "loading" }
  | { type: "progress"; progress: number; file?: string }
  | { type: "ready" }
  | { type: "audio"; requestId: string; samples: ArrayBuffer; samplingRate: number }
  | { type: "error"; requestId?: string; message: string };
