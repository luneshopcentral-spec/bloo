/**
 * Dispensing (SIG) shorthand typed in the directions box, rendered as a
 * plain-English label: "1c qid pc x 7/7" → "Take ONE capsule four times a day
 * after food for 7 days". The student's own words and capitals are kept; only
 * recognised shorthand is rewritten. Grading expands both the prescription and
 * the student's entry with this same function, so every alias here must keep
 * the instruction's meaning exactly.
 */

const SHORTHAND: Record<string, string> = {
  // How often
  od: "once a day", qd: "once a day",
  bd: "twice a day", bid: "twice a day",
  tds: "three times a day", tid: "three times a day",
  qid: "four times a day", qds: "four times a day",
  mane: "in the morning", om: "in the morning",
  midi: "at midday",
  vesp: "in the evening", vespere: "in the evening",
  nocte: "at night",
  hs: "at bedtime",
  eod: "every second day", qod: "every second day",
  prn: "when required", sos: "when required",
  stat: "immediately",
  mdu: "as directed", ud: "as directed",
  // With food
  ac: "before food", pc: "after food", cc: "with food",
  // Route
  po: "by mouth", sl: "under the tongue",
  sc: "by injection under the skin", subcut: "by injection under the skin",
  im: "by injection into a muscle", iv: "into a vein",
  pr: "into the back passage", pv: "into the vagina",
  inh: "by inhalation", neb: "using a nebuliser",
  // Forms and units
  susp: "suspension", sol: "solution", ung: "ointment", oint: "ointment", crm: "cream", inj: "injection",
  mg: "milligrams", mcg: "micrograms", ml: "mL",
  hr: "hour", hrs: "hours", wk: "week", wks: "weeks",
  max: "maximum",
};

const NUMBER_WORDS = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE"];
const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4 };

// Countable dose units: the pattern after a quantity, and singular/plural words.
const UNITS: Array<{ pattern: string; one: string; many: string; verb: string }> = [
  { pattern: String.raw`c|caps?|capsules?`, one: "capsule", many: "capsules", verb: "Take" },
  { pattern: String.raw`t|tabs?|tablets?`, one: "tablet", many: "tablets", verb: "Take" },
  { pattern: String.raw`puffs?`, one: "puff", many: "puffs", verb: "Inhale" },
  { pattern: String.raw`gtts?|drops?`, one: "drop", many: "drops", verb: "Use" },
  { pattern: String.raw`patch(?:es)?`, one: "patch", many: "patches", verb: "Apply" },
  { pattern: String.raw`supps?|suppositor(?:y|ies)`, one: "suppository", many: "suppositories", verb: "Insert" },
  { pattern: String.raw`pess(?:ary|aries)?`, one: "pessary", many: "pessaries", verb: "Insert" },
  { pattern: String.raw`sachets?|sach`, one: "sachet", many: "sachets", verb: "Take" },
  { pattern: String.raw`lozenges?|loz`, one: "lozenge", many: "lozenges", verb: "Take" },
  { pattern: String.raw`sprays?`, one: "spray", many: "sprays", verb: "Use" },
];

// Digits may run into their unit ("1c", "2tabs"); a word or numeral must be
// followed by a space or hyphen, so "take it" is never "take I T(ablet)".
const DIGITS = String.raw`\d+(?:\.\d+)?|½`;
const WORDS = String.raw`half|iv|i{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve`;
const DOSE = new RegExp(String.raw`(?<![\w.])(?:(${DIGITS})|(${WORDS})(?=[\s–-]))(?:\s*(?:-|–|to|or)\s*(${DIGITS}|${WORDS}))?\s*(${UNITS.map((unit) => unit.pattern).join("|")})(?![a-z])`, "gi");

/** A count as its label word ("ONE", "HALF"), or null when it is not a whole dose count. */
function countWord(token: string): { word: string; value: number } | null {
  const lower = token.toLowerCase();
  if (lower === "½" || lower === "half" || lower === "0.5") return { word: "HALF", value: 0.5 };
  const value = ROMAN[lower] ?? (/^\d+$/.test(lower) ? Number(lower) : NUMBER_WORDS.indexOf(lower.toUpperCase()));
  if (!Number.isInteger(value) || value < 1 || value >= NUMBER_WORDS.length) return null;
  return { word: NUMBER_WORDS[value], value };
}

function unitFor(token: string) {
  return UNITS.find((unit) => new RegExp(`^(?:${unit.pattern})$`, "i").test(token))!;
}

function renderDose(match: string, first: string, second: string | undefined, unitToken: string): string {
  const unit = unitFor(unitToken);
  const from = countWord(first);
  const to = second === undefined ? null : countWord(second);
  if (!from || (second !== undefined && !to)) return match;
  if (from.value === 0.5 && !to) return `HALF a ${unit.one}`;
  const joiner = /\bor\b/i.test(match) ? "or" : "to";
  const amount = to ? `${from.word} ${joiner} ${to.word}` : from.word;
  return `${amount} ${(to ?? from).value > 1 ? unit.many : unit.one}`;
}

function plural(count: string, word: string): string {
  return `${count} ${word}${count === "1" ? "" : "s"}`;
}

export function expandAbbrevs(text: string): string {
  if (!text.trim()) return text;
  let result = text
    // Dotted forms: "p.r.n." → "prn", "b.i.d" → "bid".
    .replace(/\b((?:[a-z]\.){1,3}[a-z])\.?(?![a-z])/gi, (dotted, letters: string) => {
      const collapsed = letters.replace(/\./g, "");
      return SHORTHAND[collapsed.toLowerCase()] ? collapsed : dotted;
    })
    .replace(/\s*[&+]\s*/g, " and ")
    // Durations: "x 7/7" = 7 days, "2/52" = 2 weeks, "for 3/12" = 3 months.
    .replace(/\b(?:x\s*|for\s+)?(\d+)\s*\/\s*7\b(?!\s*\/)/gi, (_, n: string) => `for ${plural(n, "day")}`)
    .replace(/\b(?:x\s*|for\s+)?(\d+)\s*\/\s*52\b(?!\s*\/)/gi, (_, n: string) => `for ${plural(n, "week")}`)
    .replace(/\b(?:x\s*|for\s+)(\d+)\s*\/\s*12\b(?!\s*\/)/gi, (_, n: string) => `for ${plural(n, "month")}`)
    .replace(/\bx\s*(\d+)\s*(?:d|days?)\b/gi, (_, n: string) => `for ${plural(n, "day")}`)
    .replace(/\bx\s*(\d+)\s*(?:wks?|weeks?)\b/gi, (_, n: string) => `for ${plural(n, "week")}`)
    .replace(/\bmax(?:imum)?\.?\s*(\d+)\s*\/\s*24\b/gi, "maximum $1 in 24 hours")
    // Intervals: "q4h", "q.4.h.", "4 hrly", "q4-6h", "6-hourly".
    .replace(/\bq\.?\s*(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*\.?\s*h(?:rs?|ours?|rly|ourly)?\b\.?/gi, (_, a: string, b?: string) =>
      b ? `every ${a} to ${b} hours` : a === "1" ? "every hour" : `every ${a} hours`)
    .replace(/\b(\d+)(?:\s*(?:-|to)\s*(\d+))?\s*-?\s*(?:hrly|hourly)\b/gi, (_, a: string, b?: string) =>
      b ? `every ${a} to ${b} hours` : `every ${a} hours`)
    // Volumes keep their digits: "10ml" → "10 mL".
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:ml|mls|millilitres?|milliliters?)\b/gi, "$1 mL")
    .replace(/(\d)(mg|mcg)\b/gi, "$1 $2")
    // Dose counts: "1c", "i-ii tabs", "1 to 2 tablets" → "ONE to TWO tablets".
    .replace(DOSE, (match, digits: string | undefined, word: string | undefined, second: string | undefined, unit: string) =>
      renderDose(match, (digits ?? word)!, second, unit))
    .replace(/\b[a-z]+\b/gi, (word) => SHORTHAND[word.toLowerCase()] ?? word)
    .replace(/\s{2,}/g, " ")
    .trim();

  // A label starts with what to do: "ONE capsule…" → "Take ONE capsule…".
  const dose = new RegExp(String.raw`^(?:(?:${NUMBER_WORDS.slice(1).join("|")}|HALF)(?: (?:to|or) [A-Z]+)?(?: a)?|\d+(?:\.\d+)? mL)\b\s*(\w+)?`).exec(result);
  if (dose) {
    const unit = dose[1] ? UNITS.find((entry) => entry.one === dose[1].toLowerCase() || entry.many === dose[1].toLowerCase()) : undefined;
    result = `${unit?.verb ?? "Take"} ${result}`;
  } else if (/^as directed\b/i.test(result)) {
    result = `Take ${result}`;
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
}
