/**
 * Conservative typo correction for student counselling text.
 *
 * Students type quickly ("Your Antibitoics are ready", "any alergy?"), and the
 * rules matcher only recognises correctly spelt words. This corrects a misspelt
 * word to a counselling term only when the correction is unambiguous.
 *
 * Safety rules:
 * - Corrections only ever go *to* the TARGETS below, which deliberately contain
 *   no medicine names, strengths, doses or units — a typo can never become a
 *   different drug or dose. Tokens containing digits are never touched.
 * - Real words that sit one edit away from a target are PROTECTED and never
 *   changed (e.g. "shallow" breathing is not "swallow", "injection" is not
 *   "infection", "no worries" is not "no worried").
 * - Inflections of known words ("dispensed", "supplies") are left alone.
 * - Only tokens of 6+ letters are considered, one edit (two for 10+ letters with
 *   the same first letter), and ties are left uncorrected.
 *
 * Understanding only: callers keep the student's original words for evidence.
 */

const TARGETS = [
  "antibiotic", "antibiotics", "allergy", "allergies", "allergic",
  "medicine", "medicines", "medication", "medications", "prescription", "prescriptions",
  "prescriber", "prescribed", "pharmacist", "pharmacy", "capsule", "capsules",
  "tablet", "tablets", "doctor", "repeat", "collect", "directions", "stomach",
  "nausea", "nauseous", "infection", "bacteria", "bacterial", "breathing", "breathe",
  "swelling", "swollen", "reaction", "reactions", "symptoms", "supplement", "supplements",
  "vitamin", "vitamins", "herbal", "pregnant", "pregnancy", "breastfeeding", "alcohol",
  "drowsy", "drowsiness", "dizziness", "headache", "kidney", "kidneys", "bleeding",
  "bruising", "emergency", "hospital", "urgent", "urgently", "immediately", "ambulance",
  "complete", "finish", "course", "continue", "remember", "missed", "weekly", "morning",
  "evening", "bedtime", "without", "separate", "antacid", "antacids", "refrigerate",
  "refrigerator", "fridge", "storage", "bottle", "measure", "syringe", "teaspoon",
  "sunscreen", "sunlight", "upright", "contact", "clarify", "confirm", "explain",
  "questions", "concerns", "problem", "worried", "address", "birthday", "identity",
  "vomiting", "diarrhoea", "diarrhea", "tremor", "tremors", "unsteady", "confused",
  "confusion", "dehydrated", "dehydration", "tolerance", "overdose", "grandchildren",
  "secure", "patches", "schedule", "dispense", "dispensed", "dispensing", "supply",
  "supplied", "available", "arthritis", "diabetes", "diabetic", "pressure", "cholesterol",
  "painkiller", "painkillers", "anticoagulant", "inflammatory", "sedation", "sedative",
  "driving", "machinery", "ready",
];

/** Legitimate words one edit from a target. Never "corrected". */
const PROTECTED = [
  "shallow", "injection", "injections", "tables", "spelling", "smelling", "selling",
  "dwelling", "verbal", "bridge", "contract", "contracts", "looked", "messed", "kissed",
  "coarse", "source", "sources", "compete", "concert", "mediation", "supplier",
  "matches", "matched", "watches", "catches", "batches", "batch", "allergen", "worry",
  "worries", "vomit", "bleed", "breath", "breathless", "label", "labels", "leaflet",
  "weakly", "finnish", "conform", "repent", "argent", "supple", "patched", "patchy",
  "miss", "battle",
];

const KNOWN = new Set([...TARGETS, ...PROTECTED]);

/** "dispensed", "supplies", "collecting", "separately" are inflections of known words. */
function isInflectionOfKnown(word: string): boolean {
  if (word.endsWith("ies") && KNOWN.has(`${word.slice(0, -3)}y`)) return true;
  if (word.endsWith("ied") && KNOWN.has(`${word.slice(0, -3)}y`)) return true;
  for (const suffix of ["ing", "ed", "es", "s", "ly", "er", "ers", "ness"]) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    if (stem.length < 3) continue;
    if (KNOWN.has(stem) || KNOWN.has(`${stem}e`)) return true;
    // Doubled final consonant: "stopped" -> "stop".
    if (stem.length > 3 && stem.at(-1) === stem.at(-2) && KNOWN.has(stem.slice(0, -1))) return true;
  }
  return false;
}

/** Optimal-string-alignment distance (edits incl. adjacent swaps), capped at max + 1. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j += 1) d[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, d[i - 2][j - 2] + 1);
      }
      d[i][j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function correctWord(token: string): string {
  const word = token.toLowerCase();
  if (word.length < 6 || KNOWN.has(word) || isInflectionOfKnown(word)) return token;
  const max = word.length >= 10 ? 2 : 1;
  let best: string | null = null;
  let bestDistance = max + 1;
  let tied = false;
  for (const target of TARGETS) {
    if (Math.abs(target.length - word.length) > max) continue;
    if (max === 2 && target[0] !== word[0]) continue;
    const distance = editDistance(word, target, max);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
      tied = false;
    } else if (distance === bestDistance && best !== null) {
      tied = true;
    }
  }
  if (!best || bestDistance > max || tied) return token;
  return token[0] === token[0].toUpperCase() ? best[0].toUpperCase() + best.slice(1) : best;
}

/** Correct unambiguous misspellings of counselling vocabulary; leave everything else as typed. */
export function correctTypos(text: string): string {
  // Whole alphabetic words only; tokens with digits or apostrophes are left intact.
  return text.replace(/[A-Za-z]+(?:'[A-Za-z]+)*/g, (token) => (token.includes("'") ? token : correctWord(token)));
}
