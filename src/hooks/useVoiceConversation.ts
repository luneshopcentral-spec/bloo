"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePatientVoice } from "@/hooks/usePatientVoice";
import type { PatientAudioSegment } from "@/lib/conversation/types";
import { getKokoroVoice } from "@/lib/voice/kokoro-config";
import {
  getSpeechRecognitionConstructor,
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

interface UseVoiceConversationOptions {
  patientKey: string;
  onTranscript: (transcript: string) => void;
}

export function useVoiceConversation({
  patientKey,
  onTranscript,
}: UseVoiceConversationOptions) {
  const [recognitionSupported, setRecognitionSupported] = useState<boolean | null>(null);
  const [synthesisSupported, setSynthesisSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activity, setActivity] = useState<VoiceActivity>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptCallbackRef = useRef(onTranscript);

  useEffect(() => {
    transcriptCallbackRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const recognitionConstructor = getSpeechRecognitionConstructor(window);
    const canUseSystemSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    const canUseRecordedOrKokoro = Boolean(window.Audio && window.Worker);
    setRecognitionSupported(Boolean(recognitionConstructor));
    setSynthesisSupported(canUseRecordedOrKokoro || canUseSystemSpeech);

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
    };
  }, []);

  const systemPatientVoice = useMemo(
    () => selectPatientVoice(voices, patientKey),
    [patientKey, voices]
  );

  const abortListening = useCallback(() => {
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
  }, []);

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
    try {
      recognitionRef.current?.stop();
    } catch {
      abortListening();
    }
  }, [abortListening]);

  const startListening = useCallback(() => {
    const RecognitionConstructor = getSpeechRecognitionConstructor(window);
    if (!RecognitionConstructor) {
      setRecognitionSupported(false);
      setErrorMessage("Voice recognition is unavailable in this browser. Continue by typing.");
      setActivity("error");
      return;
    }

    cancelSpeech();
    abortListening();
    setErrorMessage(null);
    transcriptCallbackRef.current("");

    const recognition = new RecognitionConstructor();
    let recognisedText = "";
    recognition.lang = "en-AU";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
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
      transcriptCallbackRef.current(recognisedText);
      if (hasFinalResult) setActivity("review");
    };
    recognition.onerror = (event) => {
      setErrorMessage(speechRecognitionErrorMessage(event.error));
      setActivity("error");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setActivity((current) => {
        if (current === "error") return current;
        return recognisedText ? "review" : "idle";
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
  }, [abortListening, cancelSpeech]);

  const speak = useCallback((segments: PatientAudioSegment[]) => {
    abortListening();
    setErrorMessage(null);
    void patientVoice.speak(segments).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "The patient voice could not play.");
      setActivity("error");
    });
  }, [abortListening, patientVoice]);

  const engine = patientVoice.engine;
  return {
    recognitionSupported,
    synthesisSupported,
    patientVoiceName: engine === "prerecorded"
      ? "Recorded patient library"
      : engine === "kokoro"
        ? `Kokoro ${getKokoroVoice(patientKey)}`
        : systemPatientVoice?.name ?? "default voice",
    patientVoiceLanguage: engine === "prerecorded"
      ? "en-AU"
      : engine === "kokoro"
        ? "en-GB"
        : systemPatientVoice?.lang ?? null,
    patientVoiceIsAustralian: engine === "prerecorded"
      || (engine === "system"
        && (systemPatientVoice?.lang.toLowerCase().replace("_", "-").startsWith("en-au") ?? false)),
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
    cancelSpeech,
  };
}
