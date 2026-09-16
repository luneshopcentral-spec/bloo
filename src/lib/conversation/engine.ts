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
}

export function createDialogueState(): DialogueState {
  return { turns: 0, addressed: new Set(), evidence: {}, unsafeAdvice: [], concernShown: false, pendingTopicId: null, lastFactTopicId: null };
}

function dynamicSegment(text: string): PatientAudioSegment {
  // Dynamic lines deliberately have no recorded cue identity to accidentally
  // play a different, older fact. Existing voice fallback handles this cue.
  return { cueId: "dialogue-dynamic", text };
}

function contextText(c: ConversationCase, state: DialogueState, raw: string): string {
  const text = normalizeLanguage(raw);
  if (state.lastFactTopicId && /^(?:which (?:one|medicine)|what (?:was it|is it called)|can you tell me more|what reaction|what happened|what dose)(?: please)?[?.]*$/.test(text)) {
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

function additionalSafety(c: ConversationCase, raw: string, matchedIds: string[]): UnsafeAdviceFinding[] {
  const findings: UnsafeAdviceFinding[] = [];
  for (const clause of conversationClauses(raw)) {
    const text = normalizeLanguage(clause);
    if (isQuestion(clause) || isMetaStatement(clause)) continue;
    const dose = /\b(?:take|give|use)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|half|\d+(?:\.\d+)?)\s+(?:capsules?|tablets?|ml)\b/.exec(text);
    if (dose && !negatedAction(text, dose.index)
      && !matchedIds.some(id => /directions|dose|metformin_xr_admin/.test(id))) {
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

/** One pure transition shared by live dialogue, resumed drafts and server grading. */
export function advanceConversation(c: ConversationCase, previous: DialogueState, raw: string) {
  const state: DialogueState = { ...previous, turns: previous.turns + 1, addressed: new Set(previous.addressed), evidence: { ...previous.evidence }, unsafeAdvice: [...previous.unsafeAdvice] };
  const text = contextText(c, previous, raw);
  let matchedTopicIds = classifyWithRules(c, text).map(m => m.topicId);
  const findings = [...findUnsafeAdvice(c, raw), ...additionalSafety(c, raw, matchedTopicIds)];
  if (findings.length) {
    // Never praise a recognised instruction in the same turn as a conflicting
    // dose or dangerous recommendation. Keep the original evidence for review.
    matchedTopicIds = matchedTopicIds.filter(id => c.topics.find(t => t.id === id)?.category === "information_gathering");
    for (const finding of findings) {
      if (!state.unsafeAdvice.some(f => f.id === finding.id && f.excerpt === finding.excerpt)) state.unsafeAdvice.push(finding);
    }
  }
  for (const id of matchedTopicIds) {
    state.addressed.add(id);
    state.evidence[id] = [...(state.evidence[id] ?? []), raw].slice(-3);
  }

  const responses: PatientAudioSegment[] = [];
  const push = (reply: string) => {
    if (!responses.some(s => s.text === reply)) responses.push(dynamicSegment(reply));
  };
  const facts = matchedTopicIds.filter(id => c.topics.find(t => t.id === id)?.category === "information_gathering");
  state.lastFactTopicId = facts.at(-1) ?? null;
  if (findings.length) {
    push(findings.some(f => f.id === "unverified_dose")
      ? "That dose sounds different from the plan. Could you check the prescription and explain exactly how much and how often?"
      : "I'm confused about that advice. Could you check it against the prescription and explain the safe plan before I do anything?");
  }
  const safeTopicIds = findings.length ? facts : matchedTopicIds;
  if (safeTopicIds.length) {
    const result = buildPatientReply(c, safeTopicIds, previous.addressed, state.turns, true, null);
    responses.push(...result.audioSegments);
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
  if (responses.length === 0) {
    const intent = isMetaStatement(text) ? null : matchResponseIntent(c, text);
    if (intent && !["dosing_instruction", "affirmative_answer", "negative_answer", "wrong_dosage_form_advice"].includes(intent.id)) {
      push(intent.patientReplies[state.turns % intent.patientReplies.length]);
    } else if (state.pendingTopicId && /^(?:yes|no|sure|okay|ok|with a meal)[.! ]*$/.test(normalizeLanguage(text))) {
      push("Could you explain what you mean for my medicine and what I should do? I need a little more detail.");
    } else {
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
  return { state, matchedTopicIds, reply: { text: responses.map(s => s.text).join(" "), audioSegments: responses } };
}

export function replayConversation(c: ConversationCase, transcript: ConversationMessage[]): DialogueState {
  // Submitted patient text, matched IDs and numeric scores are untrusted.
  return transcript.filter(m => m.role === "student").reduce((state, m) => advanceConversation(c, state, m.text).state, createDialogueState());
}

export function evaluateConversation(c: ConversationCase, transcript: ConversationMessage[]) {
  const state = replayConversation(c, transcript);
  return scoreCounselling({ conversation: c, addressedTopicIds: state.addressed, unsafeAdvice: state.unsafeAdvice, transcript, matcherMode: "rules", evidence: state.evidence });
}
