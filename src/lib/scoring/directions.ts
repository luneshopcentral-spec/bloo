import { expandAbbrevs } from "./abbreviations";

// Only meaning-preserving aliases belong here. Never use fuzzy word overlap for
// prescription instructions: changing one number can change the whole dose.
export function canonicalDirections(value: string): string {
  return expandAbbrevs(value)
    .toLowerCase()
    // "Take" is the default verb: "take as directed" is "as directed".
    .replace(/^take\s+/, "")
    .replace(/[–—]/g, "-")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (word) =>
      ({ one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12" })[word]!)
    .replace(/\bhalf(?: (?:a|an|of a))?\b/g, "0.5")
    .replace(/\b(tabs?|tablets?)\b/g, "tablet")
    .replace(/\b(caps?|capsules?)\b/g, "capsule")
    .replace(/\bpatches\b/g, "patch")
    .replace(/\b(drop|puff|sachet|lozenge|spray)s\b/g, "$1")
    .replace(/\bsuppositories\b/g, "suppository")
    .replace(/\bpessaries\b/g, "pessary")
    .replace(/\b(millilitres?|milliliters?|mls)\b/g, "ml")
    .replace(/\bhrs?\b/g, "hours")
    .replace(/\btwice\b/g, "2 times")
    .replace(/\bonce\b/g, "1 time")
    .replace(/\b(?:a|per) day\b/g, "daily")
    .replace(/\bevery day\b/g, "daily")
    .replace(/\b1 time daily\b/g, "daily")
    .replace(/\bin the morning\b/g, "morning")
    .replace(/\bin the evening\b/g, "evening")
    .replace(/\b(?:at night|at bedtime|before bed)\b/g, "night")
    .replace(/\b(?:at )?(?:midday|noon)\b/g, "midday")
    .replace(/\b(?:after food|after eating)\b/g, "after meals")
    .replace(/\b(?:before food|before eating)\b/g, "before meals")
    .replace(/\bwith (?:food|meals|a meal)\b/g, "with food")
    .replace(/\b(?:as|when|if) (?:required|needed|necessary)\b/g, "as needed")
    // "Take ONE tablet by mouth" says no more than "Take ONE tablet".
    .replace(/\b(?:by mouth|orally)\b/g, "")
    .replace(/\b(\d+)\s*(?:to|-|or)\s*(\d+)\b/g, "$1-$2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\b(day|week|month|hour)s\b/g, "$1")
    .replace(/(?<!\d)\.|\.(?!\d)|[,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function directionsMatch(expected: string, actual: string): boolean {
  return Boolean(actual.trim()) && canonicalDirections(expected) === canonicalDirections(actual);
}
