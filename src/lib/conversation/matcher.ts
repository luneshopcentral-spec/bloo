import type {
  AcceptedTopicMatch,
  ConversationCase,
  ConversationResponseIntent,
  ConversationTopic,
  SemanticCandidate,
  UnsafeAdviceFinding,
} from "./types";

// Calibrated for bge-small-en-v1.5 (see semantic-matcher.worker.ts): measured
// true paraphrase matches score >= ~0.70 while off-topic and wrong-but-related
// noise tops out at ~0.59, so 0.62 splits the bands with margin on both sides.
const DEFAULT_SEMANTIC_THRESHOLD = 0.62;
const MULTI_MATCH_MARGIN = 0.035;
const MAX_MATCHES_PER_TURN = 4;

export function normalizeConversationText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9%./'\s-]/g, " ")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/\b(?:mls|millilitres?|milliliters?)\b/g, "ml")
    .replace(/\b(?:medications?|medicines?|meds|drugs?)\b/g, "medicine")
    .replace(/\bopoids?\b/g, "opioid")
    .replace(/\b(?:refrigerator|refrigerated|refrigeration)\b/g, "fridge")
    .replace(/\s+/g, " ")
    .trim();
}
export function splitUtterance(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const chunks = normalized
    .split(/(?:[.!?;\n]+|\b(?:and also|also|as well as|plus|finally)\b)/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  return chunks.length > 0 ? Array.from(new Set([normalized, ...chunks])) : [normalized];
}

function patternMatches(text: string, source: string): boolean {
  try {
    return new RegExp(source, "i").test(text);
  } catch {
    return false;
  }
}

export function topicEvidenceIsValid(topic: ConversationTopic, text: string): boolean {
  const normalized = normalizeConversationText(text);

  if (topic.forbiddenPatterns?.some((pattern) => patternMatches(normalized, pattern))) {
    return false;
  }

  return (topic.requiredPatternGroups ?? []).every((group) =>
    group.some((pattern) => patternMatches(normalized, pattern))
  );
}

function hasRuleSignal(topic: ConversationTopic, text: string): boolean {
  const normalized = normalizeConversationText(text);
  return topic.fallbackPatterns.some((pattern) => patternMatches(normalized, pattern));
}

export function matchResponseIntent(
  conversation: ConversationCase,
  text: string
): ConversationResponseIntent | null {
  const normalized = normalizeConversationText(text);
  return conversation.responseIntents.find((intent) =>
    intent.fallbackPatterns.some((pattern) => patternMatches(normalized, pattern))
  ) ?? null;
}

function significantTokens(text: string): Set<string> {
  const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "do", "for", "from", "have",
    "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "the", "this",
    "to", "we", "what", "when", "with", "you", "your",
  ]);
  const aliases: Record<string, string> = {
    complete: "finish",
    completed: "finish",
    completing: "finish",
    finished: "finish",
    dosage: "dose",
    dosing: "dose",
    physician: "doctor",
    prescriber: "doctor",
    explain: "tell",
    explained: "tell",
    describe: "tell",
    describing: "tell",
    nausea: "sick",
    nauseous: "sick",
    refrigerate: "fridge",
  };
  return new Set(
    normalizeConversationText(text)
      .split(" ")
      .map((token) => aliases[token] ?? token)
      .filter((token) => token.length > 2 && !stopWords.has(token))
  );
}

function exampleOverlap(topic: ConversationTopic, text: string): number {
  const input = significantTokens(text);
  if (input.size === 0) return 0;

  return topic.examples.reduce((best, example) => {
    const expected = significantTokens(example);
    if (expected.size === 0) return best;
    const shared = [...expected].filter((token) => input.has(token)).length;
    return Math.max(best, shared / Math.max(2, expected.size));
  }, 0);
}

export function classifyWithRules(
  conversation: ConversationCase,
  text: string
): AcceptedTopicMatch[] {
  return conversation.topics
    .map((topic) => {
      const explicit = hasRuleSignal(topic, text);
      const overlap = exampleOverlap(topic, text);
      const score = explicit ? 1 : overlap;
      return { topic, score, explicit };
    })
    .filter(({ topic, score, explicit }) =>
      topicEvidenceIsValid(topic, text) && (explicit || score >= 0.72)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES_PER_TURN)
    .map(({ topic, score }) => ({ topicId: topic.id, score, source: "rules" as const }));
}

export function acceptSemanticCandidates(
  conversation: ConversationCase,
  text: string,
  candidates: SemanticCandidate[]
): AcceptedTopicMatch[] {
  const byId = new Map(conversation.topics.map((topic) => [topic.id, topic]));
  const rules = classifyWithRules(conversation, text);
  const acceptedById = new Map<string, AcceptedTopicMatch>(
    rules.map((match) => [match.topicId, match])
  );
  const bestScore = candidates[0]?.score ?? 0;

  for (const candidate of candidates) {
    const topic = byId.get(candidate.topicId);
    if (!topic || !topicEvidenceIsValid(topic, text)) continue;

    const threshold = topic.semanticThreshold ?? DEFAULT_SEMANTIC_THRESHOLD;
    const isBestOrClose = candidate.score === bestScore || candidate.score >= bestScore - MULTI_MATCH_MARGIN;
    if (candidate.score < threshold || !isBestOrClose) continue;

    const existing = acceptedById.get(candidate.topicId);
    if (!existing || candidate.score > existing.score) {
      acceptedById.set(candidate.topicId, {
        ...candidate,
        source: "semantic",
      });
    }
  }

  return [...acceptedById.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES_PER_TURN);
}

export function findUnsafeAdvice(
  conversation: ConversationCase,
  text: string
): UnsafeAdviceFinding[] {
  const normalized = normalizeConversationText(text);
  return conversation.unsafeAdviceRules
    .filter((rule) => rule.patterns.some((pattern) => patternMatches(normalized, pattern)))
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      detail: rule.detail,
      excerpt: text,
    }));
}
