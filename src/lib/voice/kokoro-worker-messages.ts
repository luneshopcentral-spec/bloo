export type KokoroWorkerRequest = {
  type: "synthesize";
  requestId: string;
  text: string;
  voice: string;
};

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
