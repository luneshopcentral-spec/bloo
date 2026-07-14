import type { SemanticCandidate } from "./types";

export interface SemanticTopicPayload {
  id: string;
  examples: string[];
}

export type SemanticWorkerRequest =
  | {
      type: "initialize";
      caseId: string;
      topics: SemanticTopicPayload[];
    }
  | {
      type: "classify";
      caseId: string;
      requestId: string;
      text: string;
    };
export type SemanticWorkerResponse =
  | {
      type: "loading";
      progress: number | null;
      message: string;
    }
  | {
      type: "ready";
      caseId: string;
      backend: "local-webgpu" | "local-wasm";
    }
  | {
      type: "result";
      caseId: string;
      requestId: string;
      candidates: SemanticCandidate[];
    }
  | {
      type: "error";
      caseId?: string;
      requestId?: string;
      message: string;
    };
