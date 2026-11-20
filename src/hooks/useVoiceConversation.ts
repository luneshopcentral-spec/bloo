"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePatientVoice } from "@/hooks/usePatientVoice";
import type { PatientAudioSegment } from "@/lib/conversation/types";
import { getKokoroVoice } from "@/lib/voice/kokoro-config";
import {
  getSpeechRecognitionConstructor,
  joinTranscript,
  keepsListeningThroughPauses,
  patientSpeechRate,
  preparePatientSpeech,
  selectPatientVoice,
  speechRecognitionErrorMessage,
  type SpeechRecognitionLike,
} from "@/lib/voice/web-speech";

export type VoiceActivity =
  | "idle"
  | "loading"
  | "generating"
  | "starting"
  | "listening"
  | "review"
  | "speaking"
  | "error";

/** Once the student has spoken, this much silence ends the recording. */
export const SILENCE_STOP_MS = 5_000;

interface UseVoiceConversationOptions {
  patientKey: string;
  /** The current response box, which new speech is added to. */
  draft: string;
  onTranscript: (transcript: string) => void;
}

export function useVoiceConversation({
  patientKey,
  draft,
  onTranscript,
}: UseVoiceConversationOptions) {
  const [recognitionSupported, setRecognitionSupported] = useState<boolean | null>(null);
  const [synthesisSupported, setSynthesisSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activity, setActivity] = useState<VoiceActivity>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptCallbackRef = useRef(onTranscript);
  const draftRef = useRef(draft);

  useEffect(() => {
    transcriptCallbackRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }, []);

  useEffect(() => {
    const recognitionConstructor = getSpeechRecognitionConstructor(window);
    const canUseSystemSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    const canUseGeneratedVoice = Boolean(window.Audio && window.Worker);
    setRecognitionSupported(Boolean(recognitionConstructor));
    setSynthesisSupported(canUseGeneratedVoice || canUseSystemSpeech);

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    if (canUseSystemSpeech) {
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }

    return () => {
      if (canUseSystemSpeech) {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      }
      recognitionRef.current = null;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const systemPatientVoice = useMemo(
    () => selectPatientVoice(voices, patientKey),
    [patientKey, voices]
  );

  const abortListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    }
    recognitionRef.current = null;
    setActivity((current) => (
      current === "starting" || current === "listening" ? "idle" : current
    ));
  }, [clearSilenceTimer]);

  const speakWithSystemVoice = useCallback((text: string, reason: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        setSynthesisSupported(false);
        setErrorMessage(`Patient audio is unavailable (${reason}). Continue in text mode.`);
        setActivity("error");
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(preparePatientSpeech(text));
      utterance.lang = systemPatientVoice?.lang || "en-AU";
      utterance.voice = systemPatientVoice;
      utterance.rate = patientSpeechRate(patientKey);
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => setActivity("speaking");
      utterance.onend = () => {
        setActivity("idle");
        resolve();
      };
      utterance.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted") {
          setErrorMessage("The patient voice could not play. Continue in text mode.");
          setActivity("error");
        }
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }, [patientKey, systemPatientVoice]);

  const handlePatientVoiceActivity = useCallback(
    (nextActivity: "idle" | "loading" | "generating" | "speaking") => {
      setActivity(nextActivity);
    },
    []
  );

  const patientVoice = usePatientVoice({
    patientKey,
    onActivity: handlePatientVoiceActivity,
    speakWithSystemVoice,
  });

  const cancelSpeech = useCallback(() => {
    patientVoice.cancel();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActivity((current) => (
      current === "loading" || current === "generating" || current === "speaking"
        ? "idle"
        : current
    ));
  }, [patientVoice]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      abortListening();
    }
  }, [abortListening, clearSilenceTimer]);

  const startListening = useCallback(() => {
    const RecognitionConstructor = getSpeechRecognitionConstructor(window);
    if (!RecognitionConstructor) {
      setRecognitionSupported(false);
      setErrorMessage("Voice input is unavailable in this browser. Use Chrome, Edge or Safari, or continue by typing.");
      setActivity("error");
      return;
    }

    cancelSpeech();
    abortListening();
    setErrorMessage(null);

    // Whatever is already in the box stays; new speech is added after it.
    const before = draftRef.current;
    const recognition = new RecognitionConstructor();
    let recognisedText = "";
    recognition.lang = "en-AU";
    recognition.continuous = keepsListeningThroughPauses(navigator.userAgent);
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const armSilenceTimer = () => {
      if (!recognition.continuous) return;
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // Already ended.
        }
      }, SILENCE_STOP_MS);
    };
    recognition.onstart = () => setActivity("listening");
    recognition.onresult = (event) => {
      const parts: string[] = [];
      let hasFinalResult = false;
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (transcript) parts.push(transcript);
        if (result.isFinal) hasFinalResult = true;
      }

      recognisedText = parts.join(" ").trim();
      transcriptCallbackRef.current(joinTranscript(before, recognisedText));
      armSilenceTimer();
      // A continuous session keeps listening after each phrase.
      if (hasFinalResult && !recognition.continuous) setActivity("review");
    };
    recognition.onerror = (event) => {
      clearSilenceTimer();
      setErrorMessage(speechRecognitionErrorMessage(event.error));
      setActivity("error");
    };
    recognition.onend = () => {
      clearSilenceTimer();
      recognitionRef.current = null;
      setActivity((current) => {
        if (current === "error") return current;
        return recognisedText || before.trim() ? "review" : "idle";
      });
    };

    recognitionRef.current = recognition;
    try {
      setActivity("starting");
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setErrorMessage("The microphone could not start. Try again, or continue by typing.");
      setActivity("error");
    }
  }, [abortListening, cancelSpeech, clearSilenceTimer]);

  const speak = useCallback((segments: PatientAudioSegment[]) => {
    abortListening();
    setErrorMessage(null);
    void patientVoice.speak(segments).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "The patient voice could not play.");
      setActivity("error");
    });
  }, [abortListening, patientVoice]);

  /** Replay the patient, giving the generated voice another go if it failed. */
  const replay = useCallback((segments: PatientAudioSegment[]) => {
    patientVoice.retry();
    speak(segments);
  }, [patientVoice, speak]);

  const engine = patientVoice.engine;
  return {
    recognitionSupported,
    synthesisSupported,
    patientVoiceName: engine === "kokoro"
      ? `Kokoro ${getKokoroVoice(patientKey)}`
      : systemPatientVoice?.name ?? "default voice",
    patientVoiceLanguage: engine === "kokoro" ? "en-GB" : systemPatientVoice?.lang ?? null,
    patientVoiceIsAustralian: engine === "system"
      && (systemPatientVoice?.lang.toLowerCase().replace("_", "-").startsWith("en-au") ?? false),
    patientVoiceEngine: engine,
    kokoroProgress: patientVoice.progress,
    patientVoiceDiagnostic: patientVoice.diagnostic,
    patientVoiceNotice: patientVoice.notice,
    activity,
    errorMessage,
    startListening,
    stopListening,
    abortListening,
    speak,
    replay,
    cancelSpeech,
  };
}
