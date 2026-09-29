import { getConversationCase } from "./cases";
import { normalizeLanguage } from "./language";
import { CASE_PHRASINGS, SHARED_PHRASINGS } from "./phrasings";
import { correctTypos } from "./spelling";

/**
 * Nearest-wording matcher: which topic a clause is worded most like, judged
 * against every line in the phrasing bank. Character n-grams make it robust
 * to plurals, tenses, typos and word order ("can't be supplied" still sits
 * next to "I can't supply it"); TF-IDF lets the rare words that carry the
 * meaning ("suspicious", "withhold") outweigh filler.
 *
 * It only says what a clause is about. Required facts (such as the exact
 * dose), the question/advice check, forbidden wordings and the dismissal veto
 * still decide whether the topic is covered — so it cannot credit advice that
 * lacks the facts. Pure and deterministic, so the live patient and grading
 * always agree. No model download and no server call.
 */
export const NEAREST_MIN_SCORE = 0.5;
/** The best topic must beat the next-best other topic by this much. */
export const NEAREST_MIN_MARGIN = 0.05;

type Vector = Map<string, number>;

interface WordingIndex {
  idf: Map<string, number>;
  lines: Array<{ topicId: string; vector: Vector }>;
}

const indexes = new Map<string, WordingIndex>();

function grams(text: string): string[] {
  const out: string[] = [];
  for (const word of normalizeLanguage(correctTypos(text)).split(" ")) {
    if (!word) continue;
    const padded = ` ${word} `;
    for (let size = 3; size <= 5; size += 1) {
      for (let start = 0; start + size <= padded.length; start += 1) out.push(padded.slice(start, start + size));
    }
  }
  return out;
}

function vectorize(text: string, idf: Map<string, number>, fallbackIdf: number): Vector {
  const counts = new Map<string, number>();
  for (const gram of grams(text)) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  const vector: Vector = new Map();
  let norm = 0;
  for (const [gram, count] of counts) {
    const weight = (1 + Math.log(count)) * (idf.get(gram) ?? fallbackIdf);
    vector.set(gram, weight);
    norm += weight * weight;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [gram, weight] of vector) vector.set(gram, weight / norm);
  return vector;
}

// Always the whole case: the engine also asks about trimmed copies holding one topic.
function buildIndex(caseId: string): WordingIndex {
  const c = getConversationCase(caseId);
  const topicIds = new Set(c.topics.map((topic) => topic.id));
  const says = { ...SHARED_PHRASINGS.says, ...(CASE_PHRASINGS[c.caseId]?.says ?? {}) };
  const texts: Array<{ topicId: string; text: string }> = [
    ...Object.entries(says).filter(([id]) => topicIds.has(id)).flatMap(([topicId, lines]) => lines.map((text) => ({ topicId, text }))),
    ...c.topics.flatMap((topic) => topic.examples.map((text) => ({ topicId: topic.id, text }))),
  ];
  const documentFrequency = new Map<string, number>();
  for (const { text } of texts) for (const gram of new Set(grams(text))) documentFrequency.set(gram, (documentFrequency.get(gram) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [gram, frequency] of documentFrequency) idf.set(gram, Math.log((texts.length + 1) / (frequency + 1)) + 1);
  const unseen = Math.log(texts.length + 1) + 1;
  return { idf, lines: texts.map(({ topicId, text }) => ({ topicId, vector: vectorize(text, idf, unseen) })) };
}

function cosine(a: Vector, b: Vector): number {
  let sum = 0;
  for (const [gram, weight] of a) {
    const other = b.get(gram);
    if (other) sum += weight * other;
  }
  return sum;
}

type Nearest = { topicId: string; score: number } | null;
// The engine asks about the same clause several times a turn (and grading
// replays whole transcripts), so recent answers are kept.
const recent = new Map<string, Nearest>();

/** The topic a clause is closest to, when the match is both strong and unambiguous. */
export function nearestTopic(caseId: string, clause: string): Nearest {
  const key = `${caseId}\u0000${clause}`;
  if (recent.has(key)) return recent.get(key)!;
  const result = computeNearest(caseId, clause);
  recent.set(key, result);
  if (recent.size > 2000) recent.delete(recent.keys().next().value!);
  return result;
}

function computeNearest(caseId: string, clause: string): Nearest {
  let index = indexes.get(caseId);
  if (!index) {
    index = buildIndex(caseId);
    indexes.set(caseId, index);
  }
  const query = vectorize(clause, index.idf, Math.log(index.lines.length + 1) + 1);
  const best = new Map<string, number>();
  for (const line of index.lines) {
    const score = cosine(query, line.vector);
    if (score > (best.get(line.topicId) ?? 0)) best.set(line.topicId, score);
  }
  const [first, second] = [...best.entries()].sort((a, b) => b[1] - a[1]);
  if (!first || first[1] < NEAREST_MIN_SCORE || first[1] - (second?.[1] ?? 0) < NEAREST_MIN_MARGIN) return null;
  return { topicId: first[0], score: first[1] };
}
