"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutePatientVoice } from "@/hooks/useOutePatientVoice";
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

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export function useVoiceConversation({
  patientKey,
  onTranscript,
}: UseVoiceConversationOptions) {
  const [recognitionSupported, setRecognitionSupported] = useState<boolean | null>(null);
  const [synthesisSupported, setSynthesisSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activity, setActivity] = useState<VoiceActivity>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [patientVoiceNotice, setPatientVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptCallbackRef = useRef(onTranscript);

  useEffect(() => {
    transcriptCallbackRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const recognitionConstructor = getSpeechRecognitionConstructor(window);
    const canUseSystemSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    const audioWindow = window as AudioWindow;
    const canUseOuteTTS = Boolean(window.Worker && (window.AudioContext || audioWindow.webkitAudioContext));
    setRecognitionSupported(Boolean(recognitionConstructor));
    setSynthesisSupported(canUseOuteTTS || canUseSystemSpeech);

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

  const speakWithSystemVoice = useCallback((text: string, fallbackReason?: string) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSynthesisSupported(false);
      setErrorMessage("Patient audio is unavailable in this browser. The transcript remains available.");
      setActivity("error");
      return;
    }

    window.speechSynthesis.cancel();
    if (fallbackReason) {
      setPatientVoiceNotice(`OuteTTS fallback: ${fallbackReason}. The system voice is being used for this session.`);
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = systemPatientVoice?.lang || "en-AU";
    utterance.voice = systemPatientVoice;
    utterance.rate = patientSpeechRate(patientKey);
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setActivity("speaking");
    utterance.onend = () => setActivity("idle");
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      setErrorMessage("The patient voice could not play. The written response is still available.");
      setActivity("error");
    };
    window.speechSynthesis.speak(utterance);
  }, [patientKey, systemPatientVoice]);

  const handleOuteActivity = useCallback((nextActivity: "idle" | "loading" | "generating" | "speaking") => {
    setActivity(nextActivity);
  }, []);

  const handleOuteFallback = useCallback((text: string, reason: string) => {
    speakWithSystemVoice(text, reason);
  }, [speakWithSystemVoice]);

  const outetts = useOutePatientVoice({
    patientKey,
    onActivity: handleOuteActivity,
    onFallback: handleOuteFallback,
  });
  const cancelOute = outetts.cancel;
  const speakWithOute = outetts.speak;

  const cancelSpeech = useCallback(() => {
    cancelOute();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setActivity((current) => (
      current === "loading" || current === "generating" || current === "speaking"
        ? "idle"
        : current
    ));
  }, [cancelOute]);

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

  const speak = useCallback((text: string) => {
    abortListening();
    setErrorMessage(null);
    speakWithOute(preparePatientSpeech(text));
  }, [abortListening, speakWithOute]);

  const usingOute = outetts.engine === "outetts";
  return {
    recognitionSupported,
    synthesisSupported,
    patientVoiceName: usingOute ? outetts.profile.name : systemPatientVoice?.name ?? null,
    patientVoiceLanguage: usingOute ? outetts.profile.language : systemPatientVoice?.lang ?? null,
    patientVoiceIsAustralian: usingOute
      ? false
      : systemPatientVoice?.lang.toLowerCase().replace("_", "-").startsWith("en-au") ?? false,
    patientVoiceEngine: outetts.engine,
    outeBackend: outetts.backend,
    outeQuantization: outetts.quantization,
    outeProgress: outetts.progress,
    outeModelReady: outetts.modelReady,
    outeDiagnostic: outetts.diagnostic,
    patientVoiceNotice,
    activity,
    errorMessage,
    startListening,
    stopListening,
    abortListening,
    speak,
    cancelSpeech,
  };
}
