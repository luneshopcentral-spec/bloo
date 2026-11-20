"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PatientAudioSegment } from "@/lib/conversation/types";
import { getKokoroVoice } from "@/lib/voice/kokoro-config";
import { KokoroSession, PatientSpeechInterrupted, speechChunks, type VoiceWorker } from "@/lib/voice/kokoro-session";
import { kokoroSpeech } from "@/lib/voice/web-speech";

export type PatientVoiceEngine = "kokoro" | "system";
export type PatientVoiceActivity = "idle" | "loading" | "generating" | "speaking";

interface UsePatientVoiceOptions {
  patientKey: string;
  onActivity: (activity: PatientVoiceActivity) => void;
  speakWithSystemVoice: (text: string, reason: string) => Promise<void>;
}

export function usePatientVoice({
  patientKey,
  onActivity,
  speakWithSystemVoice,
}: UsePatientVoiceOptions) {
  const [engine, setEngine] = useState<PatientVoiceEngine>("kokoro");
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const sessionRef = useRef<KokoroSession | null>(null);
  // After a failure the computer's voice is used for the rest of the session,
  // so a blocked download is not retried (and waited on) every turn.
  const kokoroFailedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const operationRef = useRef(0);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      // Clearing the source fires a late "error" on this element; detached,
      // it cannot stop the next sentence, which is already starting.
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const getSession = useCallback((): KokoroSession => {
    sessionRef.current ??= new KokoroSession(
      () => new Worker(
        new URL("../workers/kokoro-patient-voice.worker.ts", import.meta.url),
        { type: "module", name: "kokoro-patient-voice" }
      ) as unknown as VoiceWorker,
      setProgress,
    );
    return sessionRef.current;
  }, []);

  /** Stop the current reply. The voice model stays loaded for the next one. */
  const cancel = useCallback(() => {
    operationRef.current += 1;
    stopAudio();
    sessionRef.current?.cancel();
    onActivity("idle");
  }, [onActivity, stopAudio]);

  /** Give the generated voice another go after it failed. */
  const retry = useCallback(() => {
    kokoroFailedRef.current = false;
    setEngine("kokoro");
    setNotice(null);
    setDiagnostic(null);
  }, []);

  useEffect(() => () => {
    operationRef.current += 1;
    stopAudio();
    sessionRef.current?.dispose();
    sessionRef.current = null;
  }, [stopAudio]);

  const playBlob = useCallback((blob: Blob, operation: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (operation !== operationRef.current) {
        reject(new PatientSpeechInterrupted());
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
        reject(new Error("The patient audio could not be decoded."));
      };
      audio.play().catch((error: unknown) => {
        // Stopped on purpose (a newer reply or an interruption) is not a failure.
        reject(audioRef.current === audio ? error : new PatientSpeechInterrupted());
      });
    });
  }, [onActivity, stopAudio]);

  const speak = useCallback(async (segments: PatientAudioSegment[]) => {
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    stopAudio();
    sessionRef.current?.cancel();
    setNotice(null);

    const chunks = segments.flatMap((segment, index) => speechChunks(kokoroSpeech(segment.text)).map((text) => ({ text, segment: index })));
    if (!chunks.length) {
      onActivity("idle");
      return;
    }
    if (kokoroFailedRef.current) {
      await speakWithSystemVoice(segments.map((segment) => segment.text).join(" "), "generated voice unavailable");
      return;
    }

    const session = getSession();
    setEngine("kokoro");
    setDiagnostic(null);
    onActivity(session.ready ? "generating" : "loading");
    // Ask for every sentence now: the worker generates them in order, so the
    // next one is being made while the current one plays.
    const voice = getKokoroVoice(patientKey);
    const clips = chunks.map((chunk) => {
      const clip = session.synthesize(chunk.text, voice);
      clip.catch(() => undefined);
      return clip;
    });

    for (let index = 0; index < clips.length; index += 1) {
      try {
        const audio = await clips[index];
        if (operation !== operationRef.current) return;
        await playBlob(audio, operation);
      } catch (error) {
        if (operation !== operationRef.current || error instanceof PatientSpeechInterrupted) return;
        const reason = error instanceof Error ? error.message : "The generated voice could not play.";
        kokoroFailedRef.current = true;
        sessionRef.current?.dispose();
        sessionRef.current = null;
        setEngine("system");
        setDiagnostic(reason);
        setNotice("The generated patient voice could not run on this device, so your computer's voice is being used. Select Replay patient to try the generated voice again.");
        // The rest of the reply in its written form: the computer's voice gets
        // the medicine names right without Kokoro's respellings.
        await speakWithSystemVoice(segments.slice(chunks[index].segment).map((segment) => segment.text).join(" "), reason);
        return;
      }
    }

    if (operation === operationRef.current) onActivity("idle");
  }, [getSession, onActivity, patientKey, playBlob, speakWithSystemVoice, stopAudio]);

  return {
    engine,
    progress,
    notice,
    diagnostic,
    speak,
    cancel,
    retry,
  };
}
