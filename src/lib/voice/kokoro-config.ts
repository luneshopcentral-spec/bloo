export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
// uint8 generates about twice as fast as q8 in browser WebAssembly (measured
// 1.29x vs 0.59x real time), so the patient keeps pace with their own speech.
// It is a larger one-off download; later visits load it from the browser cache.
export const KOKORO_DTYPE = "uint8";
export const KOKORO_MODEL_DOWNLOAD_MB = 177;

// Kokoro has no Australian voice; British is the closest. Only its
// best-graded British voices are used (emma B-, isabella/george/fable C) —
// the D-grade alice and daniel are noticeably less clear.
const CASE_KOKORO_VOICES: Readonly<Record<string, string>> = {
  "case-1": "bm_george",
  "case-2": "bf_emma",
  "case-3": "bf_isabella",
  "case-4": "bm_fable",
  "case-5": "bf_emma",
  "case-6": "bf_isabella",
  "case-7": "bm_fable",
  "case-8": "bf_emma",
  "case-9": "bm_george",
  "case-10": "bf_emma",
  "case-11": "bm_fable",
  "case-12": "bf_isabella",
  "case-13": "bm_george",
};

export function getKokoroVoice(patientKey: string): string {
  return CASE_KOKORO_VOICES[patientKey] ?? "bf_emma";
}
