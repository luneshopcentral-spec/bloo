import femaleOne from "outetts/outetts.js/version/v1/default_speakers/en_female_1.json";
import femaleTwo from "outetts/outetts.js/version/v1/default_speakers/en_female_2.json";
import maleOne from "outetts/outetts.js/version/v1/default_speakers/en_male_1.json";
import maleThree from "outetts/outetts.js/version/v1/default_speakers/en_male_3.json";
import { number_to_words } from "outetts/outetts.js/version/v1/utils/number_to_words.js";

export const OUTETTS_MODEL_REPO = "OuteAI/OuteTTS-0.1-350M-GGUF";
export const OUTETTS_MODEL_FILE = "OuteTTS-0.1-350M-Q4_K_M.gguf";
export const OUTETTS_DECODER_ID = "onnx-community/WavTokenizer-large-speech-75token_decode";
export const OUTETTS_SAMPLE_RATE = 24_000;
export const OUTETTS_DOWNLOAD_MB = 348;

export interface OuteSpeakerWord {
  word: string;
  duration: number;
  codes: number[];
}

export interface OuteSpeaker {
  text: string;
  words: OuteSpeakerWord[];
}

export interface OuteVoiceProfile {
  name: string;
  language: "English";
  speaker: OuteSpeaker;
  seed: number;
}

const PROFILES = {
  femaleOne: {
    name: "Female voice 1",
    language: "English",
    speaker: femaleOne as OuteSpeaker,
    seed: 10_031,
  },
  femaleTwo: {
    name: "Female voice 2",
    language: "English",
    speaker: femaleTwo as OuteSpeaker,
    seed: 20_063,
  },
  maleOne: {
    name: "Male voice 1",
    language: "English",
    speaker: maleOne as OuteSpeaker,
    seed: 30_089,
  },
  maleThree: {
    name: "Male voice 2",
    language: "English",
    speaker: maleThree as OuteSpeaker,
    seed: 40_099,
  },
} satisfies Record<string, OuteVoiceProfile>;

const CASE_PROFILES: Readonly<Record<string, OuteVoiceProfile>> = {
  "case-1": PROFILES.maleOne,
  "case-2": PROFILES.femaleOne,
  "case-3": PROFILES.femaleTwo,
  "case-4": PROFILES.maleThree,
  "case-5": PROFILES.femaleOne,
  "case-6": PROFILES.femaleTwo,
  "case-7": PROFILES.maleOne,
  "case-8": PROFILES.femaleOne,
  "case-9": PROFILES.maleThree,
  "case-10": PROFILES.femaleTwo,
  "case-11": PROFILES.maleThree,
  "case-12": PROFILES.femaleOne,
};

const SPECIAL = {
  textStart: "<|text_start|>",
  textEnd: "<|text_end|>",
  audioStart: "<|audio_start|>",
  textSeparator: "<|text_sep|>",
  codeStart: "<|code_start|>",
  codeEnd: "<|code_end|>",
};

function normaliseText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\d+(\.\d+)?/g, (match) => number_to_words(Number(match)))
    .replace(/[-_/,\.\\]/g, " ")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function speakerPrompt(speaker: OuteSpeaker): string {
  return speaker.words
    .map((entry) => {
      const duration = `<|t_${entry.duration.toFixed(2)}|>`;
      const codes = entry.codes.map((code) => `<|${code}|>`).join("");
      return `${entry.word}${duration}${SPECIAL.codeStart}${codes}${SPECIAL.codeEnd}`;
    })
    .join("\n");
}

export function getOuteVoiceProfile(patientKey: string): OuteVoiceProfile {
  return CASE_PROFILES[patientKey] ?? PROFILES.femaleOne;
}

export function buildOutePrompt(text: string, speaker: OuteSpeaker): string {
  const words = [...normaliseText(speaker.text), ...normaliseText(text)].join(SPECIAL.textSeparator);
  return `<|im_start|>\n${SPECIAL.textStart}${words}${SPECIAL.textEnd}\n${SPECIAL.audioStart}\n${speakerPrompt(speaker)}`;
}

export function extractOuteAudioCodes(output: string): number[] {
  const codes: number[] = [];
  for (const match of output.matchAll(/<\|(\d{1,4})\|>/g)) {
    const code = Number(match[1]);
    if (Number.isInteger(code) && code >= 0 && code < 4_100) codes.push(code);
  }
  return codes;
}

export function estimateOuteMaxTokens(text: string): number {
  const wordCount = Math.max(1, normaliseText(text).length);
  return Math.max(256, Math.min(900, wordCount * 28 + 64));
}

export function splitOuteSpeech(text: string, maxCharacters = 150): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxCharacters) return [trimmed];

  const sentences = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [trimmed];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxCharacters) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      const words = sentence.split(/\s+/);
      for (const word of words) {
        if (current && `${current} ${word}`.length > maxCharacters) {
          chunks.push(current);
          current = word;
        } else {
          current = current ? `${current} ${word}` : word;
        }
      }
    } else if (current && `${current} ${sentence}`.length > maxCharacters) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function formatModelProgress(progress: number | null): string {
  if (progress === null || !Number.isFinite(progress)) return "";
  return ` ${Math.max(0, Math.min(100, Math.round(progress)))}%`;
}
