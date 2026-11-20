import { normalisePatientUtterance } from "@/lib/voice/patient-utterance";

export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

type SpeechCapableWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
};

const NATURAL_VOICE_NAMES = [
  "natural",
  "neural",
  "premium",
  "enhanced",
  "karen",
  "matilda",
  "lee",
  "james",
  "natasha",
  "william",
  "olivia",
  "aaron",
  "australian",
];

export function getSpeechRecognitionConstructor(
  browserWindow: Window
): SpeechRecognitionConstructorLike | null {
  const speechWindow = browserWindow as SpeechCapableWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  const language = voice.lang.toLowerCase().replace("_", "-");
  const name = voice.name.toLowerCase();
  let score = 0;

  if (language === "en-au") score += 1_000;
  else if (language.startsWith("en-au")) score += 950;
  else if (language === "en-nz" || language === "en-gb") score += 500;
  else if (language.startsWith("en-")) score += 300;
  else if (language.startsWith("en")) score += 200;

  if (voice.localService) score += 80;
  if (voice.default) score += 15;
  if (NATURAL_VOICE_NAMES.some((preferredName) => name.includes(preferredName))) {
    score += 40;
  }
  if (name.includes("compact")) score -= 25;

  return score;
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function selectPatientVoice(
  voices: SpeechSynthesisVoice[],
  patientKey: string
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const ranked = [...voices].sort((left, right) => {
    const scoreDifference = voiceScore(right) - voiceScore(left);
    return scoreDifference || left.name.localeCompare(right.name);
  });
  const bestScore = voiceScore(ranked[0]);
  const bestVoices = ranked.filter((voice) => voiceScore(voice) === bestScore);

  return bestVoices[stableHash(patientKey) % bestVoices.length] ?? ranked[0];
}

export function patientSpeechRate(patientKey: string): number {
  const rates = [0.96, 0.98, 1];
  return rates[stableHash(patientKey) % rates.length];
}

// How Kokoro should say the medicine names it gets wrong. Each was chosen by
// generating the speech and checking what a speech recogniser heard back
// ("amlodipine" came out as "Amla-de-pine", "sertraline" as "search rely on").
// Only for the generated voice: the on-screen text never changes, and the
// computer's own voices usually know these words.
const KOKORO_PRONUNCIATIONS: Array<[RegExp, string]> = [
  [/\bamlodipine\b/gi, "am lodi peen"],
  [/\btemazepam\b/gi, "temazzipam"],
  [/\bdoxycycline\b/gi, "doxy sigh clean"],
  [/\bfentanyl\b/gi, "fentanil"],
  [/\bamox[iy]cillin\b/gi, "a moxy sillin"],
  [/\bsertraline\b/gi, "sertraleen"],
  [/\bdexamfetamine\b/gi, "dexamfettameen"],
];

export function kokoroSpeech(text: string): string {
  let spoken = preparePatientSpeech(text);
  for (const [word, sound] of KOKORO_PRONUNCIATIONS) spoken = spoken.replace(word, sound);
  return spoken;
}

const STREET_TYPES: Record<string, string> = { St: "Street", Rd: "Road", Ave: "Avenue", Cres: "Crescent", Pde: "Parade", Ct: "Court", Hwy: "Highway" };
const MONTHS = /^(?:January|February|March|April|May|June|July|August|September|October|November|December)$/;

export function preparePatientSpeech(text: string): string {
  return normalisePatientUtterance(text)
    .replace(/(\d)\s*mcg\b/gi, "$1 micrograms")
    .replace(/(\d)\s*mg\b/gi, "$1 milligrams")
    .replace(/(\d)\s*mL\b/gi, "$1 millilitres")
    .replace(/\s*\/\s*h(?:r|our)?\b/gi, " per hour")
    .replace(/\s*\/\s*/g, " per ")
    .replace(/\bINR\b/g, "I N R")
    .replace(/\beGFR\b/g, "e G F R")
    .replace(/\bDOB\b/g, "date of birth")
    // "Lygon St, Carlton 3053": the street type in full, and the postcode
    // digit by digit, as Australians say it — not like the year "thirty fifty-three".
    .replace(/\b([A-Z][a-z]+) (St|Rd|Ave|Cres|Pde|Ct|Hwy)\b\.?/g, (_, name: string, type: string) => `${name} ${STREET_TYPES[type]}`)
    .replace(/\b([A-Z][a-z]+) (\d{4})\b(?!\.\d)/g, (match, word: string, digits: string) =>
      MONTHS.test(word) ? match : `${word} ${digits.split("").join(" ")}`);
}

/**
 * Chrome on Android repeats words in continuous recognition, so there the
 * microphone still stops at the first pause. Elsewhere it keeps listening
 * through the pauses of a longer explanation until the student stops it.
 */
export function keepsListeningThroughPauses(userAgent: string): boolean {
  return !/Android/i.test(userAgent);
}

/** A second go at the microphone adds to the draft instead of replacing it. */
export function joinTranscript(draft: string, heard: string): string {
  const before = draft.trimEnd();
  const after = heard.trim();
  if (!before) return after;
  if (!after) return before;
  return `${before} ${after}`;
}

export function speechRecognitionErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was not allowed. Allow it in the browser, or continue by typing.";
    case "audio-capture":
      return "No working microphone was found. Check the laptop microphone, or continue by typing.";
    case "no-speech":
      return "No speech was detected. Try again and speak clearly, or type your response.";
    case "network":
      return "This browser's speech service could not be reached. Voice input works in Chrome, Edge and Safari; you can keep typing here.";
    case "language-not-supported":
    case "language-unavailable":
      return "Australian English recognition is unavailable in this browser. Continue by typing.";
    default:
      return "Voice recognition stopped unexpectedly. You can try again or continue by typing.";
  }
}
