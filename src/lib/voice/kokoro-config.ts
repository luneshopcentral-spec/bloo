export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const KOKORO_MODEL_DOWNLOAD_MB = 93;

// Kokoro does not currently ship an Australian voice. British voices are used
// only as the emergency local generator; the recorded library is expected to
// contain the authored Australian patient voices.
const CASE_KOKORO_VOICES: Readonly<Record<string, string>> = {
  "case-1": "bm_george",
  "case-2": "bf_emma",
  "case-3": "bf_alice",
  "case-4": "bm_daniel",
  "case-5": "bf_emma",
  "case-6": "bf_isabella",
  "case-7": "bm_fable",
  "case-8": "bf_alice",
  "case-9": "bm_george",
  "case-10": "bf_emma",
  "case-11": "bm_fable",
  "case-12": "bf_isabella",
  "case-13": "bm_daniel",
};

export function getKokoroVoice(patientKey: string): string {
  return CASE_KOKORO_VOICES[patientKey] ?? "bf_emma";
}
