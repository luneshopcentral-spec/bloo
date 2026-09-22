import { classifyWithRules, findUnsafeAdvice, matchResponseIntent } from "./matcher";
import { conversationClauses, isMetaStatement, isQuestion, negatedAction, normalizeLanguage } from "./language";
import { buildPatientReply } from "./reply";
import { scoreCounselling } from "./score";
import type { ConversationCase, ConversationMessage, PatientAudioSegment, UnsafeAdviceFinding } from "./types";

export const MAX_CONVERSATION_MESSAGE = 2000;
export const MAX_CONVERSATION_TURNS = 60;
export const MAX_CONVERSATION_CHARACTERS = 16000;

export interface DialogueState {
  turns: number;
  addressed: Set<string>;
  evidence: Record<string, string[]>;
  unsafeAdvice: UnsafeAdviceFinding[];
  concernShown: boolean;
  pendingTopicId: string | null;
  lastFactTopicId: string | null;
  fragments: Record<string, string[]>;
  lastReply: string | null;
  unresolvedAdviceIds: string[];
}

export function createDialogueState(): DialogueState {
  return { lastReply: null, unresolvedAdviceIds: [], turns: 0, addressed: new Set(), evidence: {}, fragments: {}, unsafeAdvice: [], concernShown: false, pendingTopicId: null, lastFactTopicId: null };
}

function dynamicSegment(text: string): PatientAudioSegment {
  // Dynamic lines deliberately have no recorded cue identity to accidentally
  // play a different, older fact. Existing voice fallback handles this cue.
  return { cueId: "dialogue-dynamic", text };
}

function contextText(c: ConversationCase, state: DialogueState, raw: string): string {
  const text = normalizeLanguage(raw).replace(/^(?:sorry|and|so)[, ]+/, "");
  if (state.lastFactTopicId && /^(?:which (?:one|medicine)(?: was (?:it|that)(?: again)?)?|what (?:was it|is it called)|can you tell me more|what reaction|what happened|what dose)(?: please)?[?.]*$/.test(text)) {
    const prompts: Record<string, string> = {
      allergies: "What medicine allergies have you had?",
      current_medicines: "What regular medicines do you take?",
    };
    return prompts[state.lastFactTopicId] ?? raw;
  }
  // A fragment only inherits the patient's actual pending question. It never
  // receives the rest of a model answer or an unspoken dose/frequency.
  if (state.pendingTopicId === "nausea_advice" && /^(?:on an empty stomach|before food|without food)[.!]*$/.test(text)) {
    return `Take it ${text}`;
  }
  if (state.pendingTopicId === "complete_course" && /^(?:no|nope)[,.! ]+(?:finish|complete|keep taking)/.test(text)) return raw;
  return raw;
}

function additionalSafety(c: ConversationCase, raw: string): UnsafeAdviceFinding[] {
  const findings: UnsafeAdviceFinding[] = [];
  for (const clause of conversationClauses(raw)) {
    const text = normalizeLanguage(clause);
    if (isQuestion(clause) || isMetaStatement(clause)) continue;
    const amounts = [...text.matchAll(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|half|\d+(?:\.\d+)?)\s+(?:\d+ (?:mg|milligram) )?(?:capsules?|tablets?|ml)\b/g)];
    const frequencies = [...text.matchAll(/\b(?:(?:once|twice|\w+ times) (?:a |per )?(?:day|daily)|every (?:\d+|six|eight|twelve) hours|[qt]ds|qid|bd)\b/g)];
    const wrongDose = c.doseRules?.some(rule =>
      (!rule.medicinePattern || new RegExp(rule.medicinePattern).test(text)) && (
        amounts.some(amount => !negatedAction(text, amount.index) && !new RegExp(rule.amountPattern).test(amount[0]))
        || frequencies.some(frequency => !negatedAction(text, frequency.index) && !new RegExp(rule.frequencyPattern).test(frequency[0]))
      ));
    if (wrongDose) {
      findings.push({ id: "unverified_dose", label: "Dose does not match the case plan", detail: "A specific dose was given without matching the case's dose and frequency. Clarify the instruction before the patient follows it.", excerpt: raw });
    }
    if (c.disposition === "hold_contact_prescriber") {
      const supply = /\b(?:i will|we will|we can|you can)\s+(?:now )?(?:supply|dispense|give you|collect|start taking)\b/.exec(text);
      if (supply && !/\b(?:if|after|once|until|before|confirmed|confirms)\b/.test(text)) {
        findings.push({ id: "supply_before_clarification", label: "Supply promised before clarification", detail: "This case requires supply to remain on hold until the prescribing concern is resolved.", excerpt: raw });
      }
    }
  }
  return findings;
}

function clarifyPartial(c: ConversationCase, state: DialogueState, id: string): string {
  const topic = c.topics.find(t => t.id === id)!;
  const evidence = normalizeLanguage((state.fragments[id] ?? []).join(". "));
  const missing = (topic.requiredPatternGroups ?? []).map(group => !group.some(p => new RegExp(p, "i").test(evidence)));
  if (id === "directions") {
    if (missing[0]) return "How much should I use each time?";
    if (missing[1] && missing[2]) return "How often should I give it, and how long should the course last?";
    if (missing[1]) return "How often should it be taken?";
    if (missing[2]) return "How many days should I give it for?";
  }
  if (id === "water_upright") return missing[0]
    ? "How much water should I take it with?"
    : "Is there anything I need to do after swallowing it?";
  if (id === "explain_hold") {
    if (missing[0]) return "Why does this repeat need checking before I can collect it?";
    if (missing[1]) return "Does that mean I need to wait before I can collect the medicine?";
    if (missing[2]) return "Who will you check with to sort out the repeat?";
  }
  return "Could you explain the rest of that for me? I want to be clear about the whole plan.";
}

/** One pure transition shared by live dialogue, resumed drafts and server grading. */
export function advanceConversation(c: ConversationCase, previous: DialogueState, raw: string) {
  const state: DialogueState = { ...previous, turns: previous.turns + 1, addressed: new Set(previous.addressed), evidence: { ...previous.evidence }, fragments: { ...previous.fragments }, unsafeAdvice: [...previous.unsafeAdvice], unresolvedAdviceIds: [...previous.unresolvedAdviceIds] };
  const repeatRequest = /^(?:(?:sorry|please) )?(?:(?:can|could|would) you (?:please )?)?(?:repeat (?:that|what you (?:said|just said))|say that (?:again|once more)|(?:i )?(?:did not|didn't) (?:hear|catch) that|(?:pardon|sorry)\??)(?: please)?[.!?]*$/.test(normalizeLanguage(raw));
  if (repeatRequest && previous.lastReply) {
    return { state, matchedTopicIds: [] as string[], reply: { text: previous.lastReply, audioSegments: [dynamicSegment(previous.lastReply)] } };
  }
  const text = contextText(c, previous, raw);
  let matchedTopicIds = classifyWithRules(c, text).map(m => m.topicId);
  const findings = [...findUnsafeAdvice(c, raw), ...additionalSafety(c, raw)];
  const partialIds: string[] = [];
  if (!findings.length && !isMetaStatement(text)) {
    for (const topic of c.topics.filter(t => t.requiredPatternGroups?.length && !matchedTopicIds.includes(t.id))) {
      const partialCase = { ...c, topics: [{ ...topic, requiredPatternGroups: [] }] };
      const normal = normalizeLanguage(text);
      const answersPending = state.pendingTopicId === topic.id && topic.requiredPatternGroups!.some(group => group.some(p => new RegExp(p, "i").test(normal)));
      if (!answersPending && !classifyWithRules(partialCase, text).length) continue;
      state.fragments[topic.id] = [...(state.fragments[topic.id] ?? []), raw].slice(-5);
      const combined = state.fragments[topic.id].join(". ");
      if (classifyWithRules({ ...c, topics: [topic] }, combined).length) {
        matchedTopicIds.push(topic.id);
      } else if (!state.addressed.has(topic.id)) partialIds.push(topic.id);
    }
  }
  if (findings.length) {
    // Never praise a recognised instruction in the same turn as a conflicting
    // dose or dangerous recommendation. Keep the original evidence for review.
    matchedTopicIds = matchedTopicIds.filter(id => c.topics.find(t => t.id === id)?.category === "information_gathering");
    for (const finding of findings) {
      if (!state.unresolvedAdviceIds.includes(finding.id)) state.unresolvedAdviceIds.push(finding.id);
      if (!state.unsafeAdvice.some(f => f.id === finding.id && f.excerpt === finding.excerpt)) state.unsafeAdvice.push(finding);
    }
    if (findings.some(f => f.id === "unverified_dose" || f.id === "double_dose")) {
      for (const topic of c.topics.filter(t => /directions|dose|admin/.test(t.id))) {
        state.addressed.delete(topic.id);
        delete state.fragments[topic.id];
      }
    }
  }
  if (!findings.length) {
    state.unresolvedAdviceIds = state.unresolvedAdviceIds.filter(id => {
      if (id === "unverified_dose") return !c.doseRules?.some(rule => matchedTopicIds.includes(rule.topicId));
      if (id === "supply_before_clarification") return !matchedTopicIds.includes("explain_hold");
      if (id === "double_dose") return !/\b(?:do not|never|must not)\b.{0,25}\bdouble\b/.test(normalizeLanguage(raw));
      return true;
    });
  }
  const requestedTeachBack = matchedTopicIds.includes("teach_back");
  const hasExplainedPlan = c.topics.some(topic =>
    (topic.category === "clinical_counselling" || topic.category === "safety_netting" || topic.teachBackReply)
    && topic.id !== "teach_back"
    && (state.addressed.has(topic.id) || matchedTopicIds.includes(topic.id)));
  const teachBackBlocked = requestedTeachBack && (!hasExplainedPlan || state.unresolvedAdviceIds.length > 0);
  if (teachBackBlocked) matchedTopicIds = matchedTopicIds.filter(id => id !== "teach_back");
  for (const id of matchedTopicIds) {
    state.addressed.add(id);
    state.evidence[id] = [...new Set([...(state.evidence[id] ?? []), ...(state.fragments[id] ?? []), raw])].slice(-5);
  }

  const responses: PatientAudioSegment[] = [];
  const push = (reply: string) => {
    if (!responses.some(s => s.text === reply)) responses.push(dynamicSegment(reply));
  };
  if (!findings.length && partialIds.length) {
    const id = partialIds[0];
    state.pendingTopicId = id;
    push(clarifyPartial(c, state, id));
  }
  const facts = matchedTopicIds.filter(id => c.topics.find(t => t.id === id)?.category === "information_gathering");
  const acknowledgement = /^(?:thanks?(?: you)?(?: for (?:letting me know|telling me|sharing that))?|okay|ok|i see|understood|sorry to hear that)[.!]*$/.test(normalizeLanguage(raw));
  state.lastFactTopicId = facts.at(-1) ?? (acknowledgement ? previous.lastFactTopicId : null);
  if (findings.length) {
    push(findings.some(f => f.id === "unverified_dose")
      ? "That dose sounds different from the plan. Could you check the prescription and explain exactly how much and how often?"
      : "I'm confused about that advice. Could you check it against the prescription and explain the safe plan before I do anything?");
  }
  if (teachBackBlocked) push(state.unresolvedAdviceIds.length
    ? "Before I repeat the plan, I still need you to clear up the conflicting advice. What exactly should I follow?"
    : "Could you explain the plan first? Then I can tell you how I understand it.");
  const safeTopicIds = findings.length ? facts : matchedTopicIds;
  if (safeTopicIds.length) {
    const unresolvedAdvice = state.unresolvedAdviceIds.length > 0 && safeTopicIds.includes("teach_back");
    if (unresolvedAdvice) push("Before I repeat the plan, I still need you to clear up the conflicting advice. What exactly should I follow?");
    const result = buildPatientReply(c, safeTopicIds.filter(id => !(unresolvedAdvice && id === "teach_back")), previous.addressed, state.turns, true, null);
    if (safeTopicIds.some(id => !(unresolvedAdvice && id === "teach_back"))) responses.push(...result.audioSegments);
    if (safeTopicIds.includes("invite_questions")) {
      const questionTopic = c.patientQuestionTopicId ?? c.concernTopicId;
      if (!state.addressed.has(questionTopic)) state.pendingTopicId = questionTopic;
    }
  }

  // Answer unscored history questions even when another clause scored a topic.
  // Specific intents take precedence over a generic "can I ask" preamble.
  const answeredIntents = new Set<string>();
  for (const clause of conversationClauses(text)) {
    if (isMetaStatement(clause)) continue;
    const normalized = normalizeLanguage(clause);
    const historyIntent = isQuestion(clause) ? c.responseIntents.find(i =>
      ["previous_use", "medical_conditions", "current_symptoms", "diagnosis_question"].includes(i.id)
      && i.fallbackPatterns.some(p => new RegExp(p, "i").test(normalized))) : null;
    if (historyIntent && !answeredIntents.has(historyIntent.id)) {
      push(historyIntent.patientReplies[0]);
      answeredIntents.add(historyIntent.id);
    }
  }
  // True only when the patient fell through to the generic "I don't understand"
  // reply — i.e. the deterministic matcher recognised nothing in this turn. Used
  // to capture real student wording that needs a pattern (pilot corpus).
  let unrecognised = false;
  if (responses.length === 0 && acknowledgement) push("You're welcome. What else would you like to check?");
  if (responses.length === 0) {
    const intent = isMetaStatement(text) ? null : matchResponseIntent(c, text);
    if (intent && !["dosing_instruction", "affirmative_answer", "negative_answer", "wrong_dosage_form_advice"].includes(intent.id)) {
      push(intent.patientReplies[state.turns % intent.patientReplies.length]);
    } else if (state.pendingTopicId && /^(?:yes|no|sure|okay|ok|with a meal)[.! ]*$/.test(normalizeLanguage(text))) {
      push("Could you explain what you mean for my medicine and what I should do? I need a little more detail.");
    } else {
      unrecognised = !isMetaStatement(text);
      push(isQuestion(text)
        ? "I'm not sure which part of my history you mean. Could you ask me one specific question?"
        : "I'm not sure I understand the instruction. Could you explain what you want me to do, in another way?");
    }
  }
  if (state.pendingTopicId && matchedTopicIds.includes(state.pendingTopicId)) state.pendingTopicId = null;
  const alreadyAsksQuestion = responses.some(s => s.text.includes("?"));
  if (!findings.length && !state.concernShown && state.turns >= c.concernAfterTurns
    && !state.addressed.has(c.concernTopicId) && !alreadyAsksQuestion
    && !matchedTopicIds.includes("teach_back")) {
    push(c.concernPrompt);
    state.concernShown = true;
    state.pendingTopicId = c.concernTopicId;
  }
  state.lastReply = responses.map(s => s.text).join(" ");
  return { state, matchedTopicIds, unrecognised, reply: { text: state.lastReply, audioSegments: responses } };
}

export function replayConversation(c: ConversationCase, transcript: ConversationMessage[]): DialogueState {
  // Submitted patient text, matched IDs and numeric scores are untrusted.
  return transcript.filter(m => m.role === "student").reduce((state, m) => advanceConversation(c, state, m.text).state, createDialogueState());
}

export function evaluateConversation(c: ConversationCase, transcript: ConversationMessage[]) {
  const state = replayConversation(c, transcript);
  return scoreCounselling({ conversation: c, addressedTopicIds: state.addressed, unsafeAdvice: state.unsafeAdvice, transcript, matcherMode: "rules", evidence: state.evidence });
}
