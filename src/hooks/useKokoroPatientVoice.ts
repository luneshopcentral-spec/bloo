"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getKokoroVoiceProfile } from "@/lib/voice/kokoro-config";
import type {
  KokoroBackend,
  KokoroDType,
  KokoroWorkerRequest,
  KokoroWorkerResponse,
} from "@/lib/voice/kokoro-worker-messages";

export type KokoroActivity = "idle" | "loading" | "generating" | "speaking";
export type PatientVoiceEngine = "kokoro" | "system";

interface UseKokoroPatientVoiceOptions {
  patientKey: string;
  onActivity: (activity: KokoroActivity) => void;
  onFallback: (text: string, reason: string) => void;
}

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function friendlyKokoroError(message: string): string {
  if (/memory|allocation|out of memory/i.test(message)) {
    return "the laptop did not have enough available memory for the local voice model";
  }
  if (/webgpu|gpu|adapter/i.test(message)) {
    return "neither WebGPU nor the local WASM fallback could start";
  }
  if (/fetch|network|download|failed to load/i.test(message)) {
    return "the voice model could not be downloaded";
  }
  return "the local Kokoro voice could not start";
}

export function useKokoroPatientVoice({
  patientKey,
  onActivity,
  onFallback,
}: UseKokoroPatientVoiceOptions) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [engine, setEngine] = useState<PatientVoiceEngine>("kokoro");
  const [backend, setBackend] = useState<KokoroBackend | null>(null);
  const [dtype, setDtype] = useState<KokoroDType | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const pendingTextRef = useRef("");
  const failedReasonRef = useRef<string | null>(null);
  const activityCallbackRef = useRef(onActivity);
  const fallbackCallbackRef = useRef(onFallback);

  useEffect(() => {
    activityCallbackRef.current = onActivity;
  }, [onActivity]);

  useEffect(() => {
    fallbackCallbackRef.current = onFallback;
  }, [onFallback]);

  useEffect(() => {
    const audioWindow = window as AudioWindow;
    setSupported(Boolean(window.Worker && (window.AudioContext || audioWindow.webkitAudioContext)));

    return () => {
      sourceRef.current?.stop();
      sourceRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  const updateActivity = useCallback((activity: KokoroActivity) => {
    activityCallbackRef.current(activity);
  }, []);

  const fallback = useCallback((message: string) => {
    console.error("Kokoro patient voice failed:", message);
    const text = pendingTextRef.current;
    const reason = friendlyKokoroError(message);
    failedReasonRef.current = reason;
    requestIdRef.current = null;
    setEngine("system");
    updateActivity("idle");
    if (text) fallbackCallbackRef.current(text, reason);
  }, [updateActivity]);

  const playAudio = useCallback(async (message: Extract<KokoroWorkerResponse, { type: "audio" }>) => {
    if (message.requestId !== requestIdRef.current) return;
    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      fallback("audio playback is unavailable in this browser");
      return;
    }

    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    try {
      if (context.state === "suspended") await context.resume();
      const samples = new Float32Array(message.samples);
      const audioBuffer = context.createBuffer(1, samples.length, message.samplingRate);
      audioBuffer.copyToChannel(samples, 0);
      sourceRef.current?.stop();
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      source.onended = () => {
        if (sourceRef.current !== source) return;
        sourceRef.current = null;
        requestIdRef.current = null;
        updateActivity("idle");
      };
      sourceRef.current = source;
      setEngine("kokoro");
      updateActivity("speaking");
      source.start();
    } catch (error) {
      fallback(error instanceof Error ? error.message : String(error));
    }
  }, [fallback, updateActivity]);

  const ensureWorker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === "undefined") return null;

    const worker = new Worker(new URL("../workers/kokoro.worker.ts", import.meta.url), {
      type: "module",
      name: "kokoro-patient-voice",
    });
    worker.onmessage = (event: MessageEvent<KokoroWorkerResponse>) => {
      const message = event.data;
      if (message.type === "loading") {
        setBackend(message.backend);
        setDtype(message.dtype);
        setProgress(null);
        setModelReady(false);
        updateActivity("loading");
      } else if (message.type === "progress") {
        setBackend(message.backend);
        setDtype(message.dtype);
        setProgress(message.progress);
        updateActivity("loading");
      } else if (message.type === "ready") {
        setBackend(message.backend);
        setDtype(message.dtype);
        setProgress(100);
        setModelReady(true);
        setEngine("kokoro");
      } else if (message.type === "generating") {
        if (message.requestId === requestIdRef.current) updateActivity("generating");
      } else if (message.type === "audio") {
        void playAudio(message);
      } else if (message.type === "error" && message.requestId === requestIdRef.current) {
        fallback(message.message);
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (requestIdRef.current) fallback(event.message || "The Kokoro worker stopped unexpectedly.");
    };
    workerRef.current = worker;
    return worker;
  }, [fallback, playAudio, updateActivity]);

  const cancel = useCallback(() => {
    const requestId = requestIdRef.current;
    if (requestId && workerRef.current) {
      const request: KokoroWorkerRequest = { type: "cancel", requestId };
      workerRef.current.postMessage(request);
    }
    requestIdRef.current = null;
    pendingTextRef.current = "";
    sourceRef.current?.stop();
    sourceRef.current = null;
    updateActivity("idle");
  }, [updateActivity]);

  const speak = useCallback((text: string) => {
    cancel();
    pendingTextRef.current = text;
    if (failedReasonRef.current) {
      fallbackCallbackRef.current(text, failedReasonRef.current);
      return;
    }

    const audioWindow = window as AudioWindow;
    const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) {
      fallback("audio playback is unavailable in this browser");
      return;
    }
    const context = contextRef.current ?? new AudioContextConstructor();
    contextRef.current = context;
    void context.resume().catch(() => undefined);

    const worker = ensureWorker();
    if (!worker) {
      fallback("Web Workers are unavailable in this browser");
      return;
    }

    const requestId = crypto.randomUUID();
    const profile = getKokoroVoiceProfile(patientKey);
    requestIdRef.current = requestId;
    setEngine("kokoro");
    updateActivity(modelReady ? "generating" : "loading");
    const request: KokoroWorkerRequest = {
      type: "synthesize",
      requestId,
      text,
      voice: profile.voice,
      speed: profile.speed,
    };
    worker.postMessage(request);
  }, [cancel, ensureWorker, fallback, modelReady, patientKey, updateActivity]);

  const profile = getKokoroVoiceProfile(patientKey);
  return {
    supported,
    engine,
    backend,
    dtype,
    progress,
    modelReady,
    profile,
    speak,
    cancel,
  };
}
