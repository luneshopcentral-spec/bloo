export type KokoroWorkerRequest =
  | { type: "synthesize"; requestId: string; text: string; voice: string }
  /** Drop queued requests that have not started. The model stays loaded. */
  | { type: "cancel"; requestIds: string[] };

export type KokoroWorkerResponse =
  | {
      type: "loading";
      requestId: string;
      progress: number | null;
      message: string;
    }
  | {
      type: "audio";
      requestId: string;
      audio: Blob;
    }
  | {
      type: "error";
      requestId: string;
      message: string;
    };
