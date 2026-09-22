import type {
  AcceptedTopicMatch,
  ConversationCase,
  ConversationResponseIntent,
  ConversationTopic,
  UnsafeAdviceFinding,
} from "./types";
import { conversationClauses, isMetaStatement, isQuestion, negatedAction, normalizeLanguage } from "./language";

const MAX_MATCHES_PER_TURN = 20;

export function normalizeConversationText(text: string): string {
  return normalizeLanguage(text);
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
  if (isMetaStatement(text)) return false;
  if (/directions|dose|admin/.test(topic.id)
    && /\b(?:do not|never|should not|must not) (?:take|give|use) (?:one|two|three|four|\d+)\b/.test(normalized)) return false;
  if (topic.id === "complete_course" && /\b(?:do not|never|should not) (?:finish|complete|continue|keep)\b/.test(normalized)) return false;
  if (topic.category === "information_gathering" && !isQuestion(text)) return false;
  if ((topic.category === "clinical_counselling" || topic.category === "safety_netting")
    && /^(?:(?:please|so|and) )?(?:are you|have you|do you|did you|does |is there|any |what (?!this does)|how (?:are|do|did|have)|when (?:did|do|was)|which )/.test(normalized)) return false;
  if ((topic.category === "clinical_counselling" || topic.category === "safety_netting")
    && /^(?:(?:can|could|would) you (?:please )?(?:tell me|confirm|explain)|i (?:was |am )?wonder(?:ing)? (?:if|whether)|i would like to (?:ask|check|confirm)|let me (?:check|confirm))\b/.test(normalized)) return false;

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
  if (isMetaStatement(text)) return [];
  const clauses = conversationClauses(text);
  // Keep a whole turn for compound criteria (e.g. water AND upright), but
  // never let a history question borrow a counselling statement's evidence.
  return conversation.topics
    .map((topic) => {
      const eligible = clauses.filter(part => topicEvidenceIsValid({ ...topic, requiredPatternGroups: [] }, part));
      const candidates = [...eligible, eligible.join(". ")].filter(part => topicEvidenceIsValid(topic, part));
      const explicit = candidates.some(part => hasRuleSignal(topic, part));
      const score = explicit ? 1 : Math.max(0, ...candidates.map(part => exampleOverlap(topic, part)));
      return { topic, score, explicit, valid: candidates.length > 0 };
    })
    .filter(({ valid, score, explicit }) =>
      valid && (explicit || score >= 0.72)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES_PER_TURN)
    .map(({ topic, score }) => ({ topicId: topic.id, score, source: "rules" as const }));
}

export function findUnsafeAdvice(
  conversation: ConversationCase,
  text: string
): UnsafeAdviceFinding[] {
  return conversation.unsafeAdviceRules
    .filter((rule) => conversationClauses(text).some(clause => {
      const normalized = normalizeConversationText(clause);
      return rule.patterns.some(pattern => {
        const match = new RegExp(pattern, "i").exec(normalized);
        if (!match) return false;
        const action = /\b(?:supply|dispense|give|take|use|start|apply|ignore|shake|refrigerat\w*|fridge|crush|chew|split|double|stop|call)\b/.exec(match[0]);
        return !negatedAction(normalized, match.index + (action?.index ?? 0));
      });
    }))
    .map((rule) => ({
      id: rule.id,
      label: rule.label,
      detail: rule.detail,
      excerpt: text,
    }));
}
