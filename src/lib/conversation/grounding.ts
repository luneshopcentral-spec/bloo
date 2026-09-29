import { conversationClauses, isMetaStatement, isQuestion, normalizeLanguage } from "./language";
import { correctTypos } from "./spelling";
import type { GroundedReply, HeardPoint, PatientSentence } from "./types";

/**
 * Grounded patient speech: the patient repeats back only what the student
 * actually said. A point counts once it is heard in a statement (never in a
 * question), so "Do you feel sick?" is not advice that it may cause nausea.
 */

// A mention is negated by these words earlier in the same part of the clause.
const NEGATION = /\b(?:no|not|never|avoid\w*|without|stop\w*|cut out|steer clear of|stay (?:away from|out of)|keep (?:away from|out of)|refrain from|hold off|rather than|instead of|do not|does not|should not|must not|cannot|will not)\b/;
// Words that start a new part of a clause, so "If it does not settle, let us
// know" does not negate "let us know".
const BOUNDARY = /\.|\b(?:if|when|unless|because|so|then|until|once|but)\b/g;

function statementClauses(words: readonly string[]): string[] {
  return words
    .flatMap((text) => conversationClauses(correctTypos(text)))
    .filter((clause) => !isQuestion(clause) && !clause.trim().endsWith("?") && !isMetaStatement(clause))
    // Commas survive as "." so they can bound a negation.
    .map((clause) => normalizeLanguage(clause.replace(/,/g, " . ")));
}

function negatedAt(clause: string, index: number): boolean {
  const prefix = clause.slice(0, index);
  let start = 0;
  for (const boundary of prefix.matchAll(BOUNDARY)) start = boundary.index + boundary[0].length;
  return NEGATION.test(prefix.slice(start).slice(-45));
}

function heardIn(point: HeardPoint, clause: string): boolean {
  const polarity = point.polarity ?? "either";
  for (const match of clause.matchAll(new RegExp(point.heard, "gi"))) {
    if (polarity === "either" || (polarity === "negated") === negatedAt(clause, match.index)) return true;
  }
  return false;
}

function pointsHeard(sentence: PatientSentence, clauses: string[]): string[] {
  const said: string[] = [];
  const groups = new Set<string>();
  for (const point of sentence.points) {
    if (point.group && groups.has(point.group)) continue;
    if (!clauses.some((clause) => heardIn(point, clause))) continue;
    if (!said.includes(point.says)) said.push(point.says);
    if (point.group) groups.add(point.group);
  }
  return said;
}

export function joinPoints(points: readonly string[], joiner: "and" | "or" = "and"): string {
  if (points.length <= 1) return points[0] ?? "";
  return `${points.slice(0, -1).join(", ")} ${joiner} ${points.at(-1)}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The patient's words for the points the student made, or null when none of
 * the topic's points was recognised. `live` adds the reply's lead-in.
 */
export function groundedLine(grounded: GroundedReply, words: readonly string[], live: boolean): string | null {
  const clauses = statementClauses(words);
  const sentences = grounded.sentences
    .map((sentence) => ({ sentence, said: pointsHeard(sentence, clauses) }))
    .filter(({ said }) => said.length > 0)
    .map(({ sentence, said }) => sentence.template.replace("{points}", joinPoints(said, sentence.joiner)));
  if (!sentences.length) return null;
  const leadIn = live ? grounded.leadIn : undefined;
  // "Okay — it might…" continues the lead-in; a full stop starts a new sentence.
  const continues = Boolean(leadIn && /[—,]$/.test(leadIn));
  return [leadIn, ...sentences.map((sentence, index) => (index === 0 && continues ? sentence : capitalise(sentence)))]
    .filter(Boolean)
    .join(" ");
}
