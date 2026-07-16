"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversationCase, SemanticCandidate } from "@/lib/conversation/types";
import type {
  SemanticWorkerRequest,
  SemanticWorkerResponse,
} from "@/lib/conversation/worker-messages";

export type SemanticMatcherStatus = "loading" | "ready" | "fallback";

interface PendingRequest {
  resolve: (candidates: SemanticCandidate[] | null) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export function useSemanticMatcher(conversation: ConversationCase) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, PendingRequest>());
  const [status, setStatus] = useState<SemanticMatcherStatus>("loading");
  const [progress, setProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("Preparing local language model…");
  const [backend, setBackend] = useState<"local-webgpu" | "local-wasm" | "rules">("rules");

  const activateRulesFallback = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    for (const request of pendingRef.current.values()) {
      clearTimeout(request.timeoutId);
      request.resolve(null);
    }
    pendingRef.current.clear();
    setStatus("fallback");
    setBackend("rules");
    setProgress(null);
    setStatusMessage("Expanded on-device matcher active");
  }, []);

  useEffect(() => {
    const pendingRequests = pendingRef.current;
    setStatus("loading");
    setProgress(null);
    setStatusMessage("Preparing local language model…");

    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../workers/semantic-matcher.worker.ts", import.meta.url),
        { type: "module" }
      );
    } catch {
      setStatus("fallback");
      setBackend("rules");
      setStatusMessage("Expanded on-device matcher active");
      return;
    }

    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SemanticWorkerResponse>) => {
      if (workerRef.current !== worker) return;
      const message = event.data;
      if (message.type === "loading") {
        setProgress(message.progress);
        setStatusMessage(message.message);
        return;
      }
      if (message.type === "ready" && message.caseId === conversation.caseId) {
        setStatus("ready");
        setBackend(message.backend);
        setProgress(100);
        setStatusMessage(
          message.backend === "local-webgpu"
            ? "Local semantic matcher ready (WebGPU)"
            : "Local semantic matcher ready (WASM)"
        );
        return;
      }
      if (message.type === "result") {
        const pending = pendingRef.current.get(message.requestId);
        if (!pending) return;
        clearTimeout(pending.timeoutId);
        pendingRef.current.delete(message.requestId);
        pending.resolve(message.candidates);
        return;
      }
      if (message.type === "error") {
        console.error("Semantic matcher worker reported:", message.message);
        if (message.requestId) {
          const pending = pendingRef.current.get(message.requestId);
          if (pending) {
            clearTimeout(pending.timeoutId);
            pendingRef.current.delete(message.requestId);
            pending.resolve(null);
          }
        }
        activateRulesFallback();
        setStatusMessage("Semantic model unavailable — expanded on-device matcher active");
      }
    };
    worker.onerror = (event) => {
      console.error(
        "Semantic matcher worker failed:",
        event.message || "(no message)",
        event.filename ? `${event.filename}:${event.lineno}` : ""
      );
      activateRulesFallback();
      setStatusMessage("Semantic model unavailable — expanded on-device matcher active");
    };

    const request: SemanticWorkerRequest = {
      type: "initialize",
      caseId: conversation.caseId,
      topics: conversation.topics.map((topic) => ({ id: topic.id, examples: topic.examples })),
    };
    worker.postMessage(request);

    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      for (const pending of pendingRequests.values()) {
        clearTimeout(pending.timeoutId);
        pending.resolve(null);
      }
      pendingRequests.clear();
    };
  }, [activateRulesFallback, conversation]);

  const classify = useCallback((text: string): Promise<SemanticCandidate[] | null> => {
    if (status !== "ready" || !workerRef.current) return Promise.resolve(null);

    const requestId = crypto.randomUUID();
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        pendingRef.current.delete(requestId);
        resolve(null);
      }, 10000);
      pendingRef.current.set(requestId, { resolve, timeoutId });
      const request: SemanticWorkerRequest = {
        type: "classify",
        caseId: conversation.caseId,
        requestId,
        text,
      };
      workerRef.current?.postMessage(request);
    });
  }, [conversation.caseId, status]);

  return {
    status,
    progress,
    statusMessage,
    backend,
    classify,
    activateRulesFallback,
  };
}
