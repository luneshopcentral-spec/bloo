import {
  pipeline,
  type FeatureExtractionPipeline,
  type ProgressInfo,
} from "@huggingface/transformers";
import { splitUtterance } from "@/lib/conversation/matcher";
import type {
  SemanticTopicPayload,
  SemanticWorkerRequest,
  SemanticWorkerResponse,
} from "@/lib/conversation/worker-messages";
import type { SemanticCandidate } from "@/lib/conversation/types";

const MODEL_ID = "onnx-community/all-MiniLM-L6-v2-ONNX";

interface WorkerScope {
  onmessage: ((event: MessageEvent<SemanticWorkerRequest>) => void) | null;
  postMessage: (message: SemanticWorkerResponse) => void;
}

const workerScope = globalThis as unknown as WorkerScope;

let extractor: FeatureExtractionPipeline | null = null;
let activeCaseId = "";
let activeTopics: SemanticTopicPayload[] = [];
let exampleVectors = new Map<string, number[][]>();

function post(message: SemanticWorkerResponse) {
  workerScope.postMessage(message);
}

function reportProgress(info: ProgressInfo) {
  if (info.status === "progress_total") {
    post({
      type: "loading",
      progress: Math.round(info.progress),
      message: `Downloading local language model… ${Math.round(info.progress)}%`,
    });
    return;
  }

  if (info.status === "ready") {
    post({ type: "loading", progress: 100, message: "Preparing conversation examples…" });
  }
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;

  post({ type: "loading", progress: null, message: "Preparing local language model…" });
  extractor = await pipeline("feature-extraction", MODEL_ID, {
    // WASM is slower than WebGPU but substantially more reliable across managed
    // university laptops and browsers. The rules matcher remains the final fallback.
    device: "wasm",
    dtype: "q8",
    progress_callback: reportProgress,
  });
  return extractor;
}

function dot(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += left[index] * right[index];
  }
  return total;
}

async function embed(texts: string[]): Promise<number[][]> {
  const model = await getExtractor();
  const output = await model(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

async function initialize(caseId: string, topics: SemanticTopicPayload[]) {
  activeCaseId = caseId;
  activeTopics = topics;
  exampleVectors = new Map();

  const examples = topics.flatMap((topic) => topic.examples);
  const vectors = await embed(examples);
  let offset = 0;

  for (const topic of topics) {
    const nextOffset = offset + topic.examples.length;
    exampleVectors.set(topic.id, vectors.slice(offset, nextOffset));
    offset = nextOffset;
  }

  post({
    type: "ready",
    caseId,
    backend: "local-wasm",
  });
}

async function classify(caseId: string, requestId: string, text: string) {
  if (caseId !== activeCaseId || exampleVectors.size === 0) {
    throw new Error("The semantic matcher is not ready for this case.");
  }

  const chunks = splitUtterance(text);
  const inputVectors = await embed(chunks);
  const candidates: SemanticCandidate[] = activeTopics.map((topic) => {
    const references = exampleVectors.get(topic.id) ?? [];
    let score = -1;
    for (const input of inputVectors) {
      for (const reference of references) {
        score = Math.max(score, dot(input, reference));
      }
    }
    return { topicId: topic.id, score: Number(score.toFixed(4)) };
  });

  candidates.sort((left, right) => right.score - left.score);
  post({ type: "result", caseId, requestId, candidates });
}

workerScope.onmessage = (event) => {
  const message = event.data;
  const task = message.type === "initialize"
    ? initialize(message.caseId, message.topics)
    : classify(message.caseId, message.requestId, message.text);

  task.catch((error: unknown) => {
    post({
      type: "error",
      caseId: message.caseId,
      requestId: message.type === "classify" ? message.requestId : undefined,
      message: error instanceof Error ? error.message : "Local semantic matching failed.",
    });
  });
};
