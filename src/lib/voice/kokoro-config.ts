export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

export type KokoroVoiceId =
  | "af_heart"
  | "af_bella"
  | "am_michael"
  | "bf_emma"
  | "bm_george";

export interface KokoroVoiceProfile {
  voice: KokoroVoiceId;
  name: string;
  language: "American English" | "British English";
  speed: number;
}

const DEFAULT_PROFILE: KokoroVoiceProfile = {
  voice: "af_heart",
  name: "Heart",
  language: "American English",
  speed: 0.98,
};

const CASE_VOICE_PROFILES: Readonly<Record<string, KokoroVoiceProfile>> = {
  "case-1": {
    voice: "am_michael",
    name: "Michael",
    language: "American English",
    speed: 0.98,
  },
  "case-2": {
    voice: "bf_emma",
    name: "Emma",
    language: "British English",
    speed: 0.94,
  },
  "case-3": {
    voice: "bf_emma",
    name: "Emma",
    language: "British English",
    speed: 1,
  },
  "case-4": {
    voice: "bm_george",
    name: "George",
    language: "British English",
    speed: 0.97,
  },
  "case-5": {
    voice: "af_heart",
    name: "Heart",
    language: "American English",
    speed: 0.96,
  },
  "case-6": {
    voice: "af_bella",
    name: "Bella",
    language: "American English",
    speed: 1,
  },
};

export function getKokoroVoiceProfile(patientKey: string): KokoroVoiceProfile {
  return CASE_VOICE_PROFILES[patientKey] ?? DEFAULT_PROFILE;
}

export function formatModelProgress(progress: number | null): string {
  if (progress === null || !Number.isFinite(progress)) return "";
  return ` ${Math.max(0, Math.min(100, Math.round(progress)))}%`;
}
