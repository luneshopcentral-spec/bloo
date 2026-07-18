"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PatientAudioSegment } from "@/lib/conversation/types";
import { getKokoroVoice } from "@/lib/voice/kokoro-config";
import type {
  KokoroWorkerRequest,
  KokoroWorkerResponse,
} from "@/lib/voice/kokoro-worker-messages";
import { patientAudioPublicPath } from "@/lib/voice/patient-audio-library";
import { preparePatientSpeech } from "@/lib/voice/web-speech";

export type PatientVoiceEngine = "prerecorded" | "kokoro" | "system";
export type PatientVoiceActivity = "idle" | "loading" | "generating" | "speaking";

interface UsePatientVoiceOptions {
  patientKey: string;
  onActivity: (activity: PatientVoiceActivity) => void;
  speakWithSystemVoice: (text: string, reason: string) => Promise<void>;
}

interface PendingSynthesis {
  resolve: (audio: Blob) => void;
  reject: (error: Error) => void;
}

const knownMissingAssets = new Set<string>();

export function usePatientVoice({
  patientKey,
  onActivity,
  speakWithSystemVoice,
}: UsePatientVoiceOptions) {
  const [engine, setEngine] = useState<PatientVoiceEngine>("prerecorded");
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, PendingSynthesis>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const operationRef = useRef(0);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const closeWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    for (const pending of pendingRef.current.values()) {
      pending.reject(new Error("Patient voice generation was cancelled."));
    }
    pendingRef.current.clear();
  }, []);

  const cancel = useCallback(() => {
    operationRef.current += 1;
    stopAudio();
    closeWorker();
    onActivity("idle");
  }, [closeWorker, onActivity, stopAudio]);

  useEffect(() => () => {
    operationRef.current += 1;
    stopAudio();
    closeWorker();
  }, [closeWorker, stopAudio]);

  const getWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL("../workers/kokoro-patient-voice.worker.ts", import.meta.url),
      { type: "module", name: "kokoro-patient-voice" }
    );
    worker.onmessage = (event: MessageEvent<KokoroWorkerResponse>) => {
      const message = event.data;
      if (message.type === "loading") {
        setProgress(message.progress);
        onActivity(message.progress === 100 ? "generating" : "loading");
        return;
      }
      const pending = pendingRef.current.get(message.requestId);
      if (!pending) return;
      pendingRef.current.delete(message.requestId);
      if (message.type === "audio") pending.resolve(message.audio);
      else pending.reject(new Error(message.message));
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || "The Kokoro worker stopped unexpectedly.");
      for (const pending of pendingRef.current.values()) pending.reject(error);
      pendingRef.current.clear();
      setDiagnostic(error.message);
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    workerRef.current = worker;
    return worker;
  }, [onActivity]);

  const synthesize = useCallback((text: string): Promise<Blob> => {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject });
      const request: KokoroWorkerRequest = {
        type: "synthesize",
        requestId,
        text: preparePatientSpeech(text),
        voice: getKokoroVoice(patientKey),
      };
      try {
        getWorker().postMessage(request);
      } catch (error) {
        pendingRef.current.delete(requestId);
        reject(error instanceof Error ? error : new Error("Kokoro could not start."));
      }
    });
  }, [getWorker, patientKey]);

  const playBlob = useCallback((blob: Blob, operation: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (operation !== operationRef.current) {
        reject(new Error("Patient voice playback was cancelled."));
        return;
      }
      stopAudio();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      objectUrlRef.current = objectUrl;
      audioRef.current = audio;
      audio.onplay = () => onActivity("speaking");
      audio.onended = () => {
        stopAudio();
        resolve();
      };
      audio.onerror = () => {
        stopAudio();
        reject(new Error("The patient audio file could not be decoded."));
      };
      audio.play().catch(reject);
    });
  }, [onActivity, stopAudio]);

  const loadRecordedAsset = useCallback(async (segment: PatientAudioSegment): Promise<Blob | null> => {
    const path = patientAudioPublicPath(patientKey, segment.cueId);
    if (knownMissingAssets.has(path)) return null;
    try {
      const response = await fetch(path, { cache: "force-cache" });
      if (!response.ok) {
        if (response.status === 404) knownMissingAssets.add(path);
        return null;
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("audio/") && blob.size < 128) {
        knownMissingAssets.add(path);
        return null;
      }
      return blob;
    } catch {
      return null;
    }
  }, [patientKey]);

  const speak = useCallback(async (segments: PatientAudioSegment[]) => {
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    stopAudio();
    setNotice(null);
    setDiagnostic(null);

    for (const segment of segments) {
      if (operation !== operationRef.current) return;
      const recorded = await loadRecordedAsset(segment);
      if (recorded) {
        try {
          setEngine("prerecorded");
          setProgress(null);
          await playBlob(recorded, operation);
          continue;
        } catch (error) {
          if (operation !== operationRef.current) return;
          const reason = error instanceof Error ? error.message : "The recording could not be played.";
          setDiagnostic(`Recorded asset ${patientAudioPublicPath(patientKey, segment.cueId)}: ${reason}`);
        }
      }

      const missingPath = patientAudioPublicPath(patientKey, segment.cueId);
      setNotice(
        `Recorded line ${segment.cueId}.mp3 is unavailable. Kokoro is providing the local safety voice.`
      );
      setDiagnostic((current) => current ?? `Missing recorded asset: ${missingPath}`);
      try {
        setEngine("kokoro");
        onActivity("loading");
        const generated = await synthesize(segment.text);
        if (operation !== operationRef.current) return;
        await playBlob(generated, operation);
      } catch (error) {
        if (operation !== operationRef.current) return;
        const reason = error instanceof Error ? error.message : "Kokoro could not generate audio.";
        setEngine("system");
        setDiagnostic(`${missingPath}; Kokoro: ${reason}`);
        setNotice("Recorded audio and Kokoro were unavailable. The operating-system voice is being used.");
        await speakWithSystemVoice(segment.text, reason);
      }
    }

    if (operation === operationRef.current) onActivity("idle");
  }, [
    loadRecordedAsset,
    onActivity,
    patientKey,
    playBlob,
    speakWithSystemVoice,
    stopAudio,
    synthesize,
  ]);

  return {
    engine,
    progress,
    notice,
    diagnostic,
    speak,
    cancel,
  };
}
