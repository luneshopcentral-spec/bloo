const TERMINAL_PUNCTUATION = /[.!?…][”’)]?$/u;

/**
 * Keep authored patient speech consistent before it reaches the transcript,
 * prerecorded-audio manifest, Kokoro, or the operating-system fallback.
 * Informal wording is intentional; this only normalises typography and pauses.
 */
export function normalisePatientUtterance(input: string): string {
  let text = input
    .normalize("NFC")
    .trim()
    .replace(/\r?\n+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/'/g, "’")
    .replace(/\s*([—–])\s*/g, " $1 ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,;!?])(?=[A-Za-z])/g, "$1 ")
    .replace(/ {2,}/g, " ");

  if (text && !TERMINAL_PUNCTUATION.test(text)) text += ".";
  return text;
}
