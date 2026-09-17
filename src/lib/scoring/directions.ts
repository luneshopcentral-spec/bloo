import { expandAbbrevs } from "./abbreviations";

// Only meaning-preserving aliases belong here. Never use fuzzy word overlap for
// prescription instructions: changing one number can change the whole dose.
export function canonicalDirections(value: string): string {
  return expandAbbrevs(value)
    .toLowerCase()
    .replace(/^take\s+(?=\d|one\b|two\b|three\b|four\b)/, "")
    .replace(/[–—]/g, "-")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/g, (word) =>
      ({ one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", twelve: "12" })[word]!)
    .replace(/\b(tabs?|tablets?)\b/g, "tablet")
    .replace(/\b(caps?|capsules?)\b/g, "capsule")
    .replace(/\bpatches\b/g, "patch")
    .replace(/\b(millilitres?|milliliters?|mls)\b/g, "ml")
    .replace(/\bhrs?\b/g, "hours")
    .replace(/\btwice\b/g, "2 times")
    .replace(/\bonce\b/g, "1 time")
    .replace(/\b(?:a|per) day\b/g, "daily")
    .replace(/\bevery day\b/g, "daily")
    .replace(/\b1 time daily\b/g, "daily")
    .replace(/\bin the morning\b/g, "morning")
    .replace(/\bat night\b/g, "night")
    .replace(/\bafter food\b/g, "after meals")
    .replace(/\bas required\b/g, "as needed")
    .replace(/\b(\d+)\s*(?:to|-)\s*(\d+)\b/g, "$1-$2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/(?<!\d)\.|\.(?!\d)|[,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function directionsMatch(expected: string, actual: string): boolean {
  return Boolean(actual.trim()) && canonicalDirections(expected) === canonicalDirections(actual);
}
