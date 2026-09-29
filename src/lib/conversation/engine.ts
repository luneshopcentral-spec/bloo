import { classifyWithRules, findUnsafeAdvice, matchResponseIntent } from "./matcher";
import { conversationClauses, isMetaStatement, isQuestion, negatedAction, normalizeLanguage } from "./language";
import { correctTypos } from "./spelling";
import { greetingReply, PATIENT_LINES, pickLine, readDialogueActs, type DialogueActs } from "./dialogue";
import { buildPatientReply, patientInvitation } from "./reply";
import { scoreCounselling } from "./score";
import { dynamicAudioSegment as dynamicSegment } from "@/lib/voice/patient-audio-library";
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
  /** The student's own name, once they introduce themselves. */
  studentName: string | null;
  greeted: boolean;
  /** The student told the patient the medicine is ready or being handed over. */
  supplyPromised: boolean;
  /** The student has said the supply is delayed or on hold. */
  holdSignalled: boolean;
  /** Rotates "I didn't follow" lines so the patient never repeats one verbatim. */
  fallbackCount: number;
}

export function createDialogueState(): DialogueState {
  return {
    lastReply: null, unresolvedAdviceIds: [], turns: 0, addressed: new Set(), evidence: {}, fragments: {},
    unsafeAdvice: [], concernShown: false, pendingTopicId: null, lastFactTopicId: null,
    studentName: null, greeted: false, supplyPromised: false, holdSignalled: false, fallbackCount: 0,
  };
}

const SUPPLY_PROMISE: Omit<UnsafeAdviceFinding, "excerpt"> = {
  id: "supply_before_clarification",
  label: "Supply promised before clarification",
  detail: "This case requires supply to remain on hold until the prescribing concern is resolved.",
};

function isHoldCase(c: ConversationCase): boolean {
  return Boolean(c.disposition) && c.disposition !== "dispense";
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

function additionalSafety(c: ConversationCase, raw: string, acts: DialogueActs): UnsafeAdviceFinding[] {
  const findings: UnsafeAdviceFinding[] = [];
  let supplyFlagged = false;
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
    // "It's too early, but you can collect it next week" keeps the hold.
    if (c.disposition === "hold_contact_prescriber" && !acts.holdSignal) {
      const supply = /\b(?:i will|we will|we can|you can)\s+(?:now )?(?:supply|dispense|give you|collect|start taking)\b/.exec(text);
      if (supply && !/\b(?:if|after|once|until|before|confirmed|confirms)\b/.test(text)) {
        findings.push({ ...SUPPLY_PROMISE, excerpt: raw });
        supplyFlagged = true;
      }
    }
  }
  // "Your antibiotics are ready" promises supply just as clearly as "I will
  // supply it" — unless the same message also says it is on hold.
  if (!supplyFlagged && isHoldCase(c) && acts.supplyStatement) {
    findings.push({ ...SUPPLY_PROMISE, excerpt: raw });
  }
  return findings;
}

function clarifyPartial(c: ConversationCase, state: DialogueState, id: string): string {
  const topic = c.topics.find(t => t.id === id)!;
  const evidence = normalizeLanguage(correctTypos((state.fragments[id] ?? []).join(". ")));
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
  if (id === "interactions" && c.caseId === "case-2") {
    if (/\bantibiotic\w*\b/.test(evidence)) return "Do you mean every antibiotic? What should I do if I need one, and what about my ibuprofen?";
    return state.lastReply?.startsWith("I'm asking about the ibuprofen")
      ? "Do you mean the ibuprofen I mentioned? What should I do before taking it?"
      : "I'm asking about the ibuprofen I take for headaches. Should I check before using it?";
  }
  if (id === "explain_hold") {
    if (c.caseId === "case-12") return missing[0]
      ? "Is the change from 2.5 to 5 milligrams the reason you're checking?"
      : "Will you check this dose with my doctor before I take the stronger tablet?";
    if (topic.clarificationPrompt) return topic.clarificationPrompt;
    // Only case 1 is a repeat; the other held prescriptions are not.
    const repeat = c.caseId === "case-1";
    if (missing[0]) return repeat ? "Why does this repeat need checking before I can collect it?" : "Why does it need checking before I can have it?";
    if (missing[1]) return "Does that mean I need to wait before I can collect the medicine?";
    if (missing[2]) return repeat ? "Who will you check with to sort out the repeat?" : "Who will you check with about it?";
  }
  if (topic.clarificationPrompt) return topic.clarificationPrompt;
  return "Could you explain the rest of that for me? I want to be clear about the whole plan.";
}

/** Small talk and procedural remarks, answered the way a real patient would. */
function socialReply(c: ConversationCase, acts: DialogueActs, seed: number): string | null {
  if (acts.holdSignal) return pickLine(isHoldCase(c) ? PATIENT_LINES.holdReactionHold : PATIENT_LINES.holdReactionDispense, seed);
  if (acts.waitThanks) return pickLine(PATIENT_LINES.waitThanks, seed);
  if (acts.howAreYou) return pickLine(PATIENT_LINES.howAreYou, seed);
  if (acts.niceToMeet) return PATIENT_LINES.niceToMeet[0];
  if (acts.greeting) return pickLine(PATIENT_LINES.greetAgain, seed);
  if (acts.sympathy) return PATIENT_LINES.sympathy[0];
  if (acts.thanksOnly) return pickLine(PATIENT_LINES.thanks, seed);
  if (acts.okayOnly) return pickLine(PATIENT_LINES.okay, seed);
  if (acts.narration) return pickLine(PATIENT_LINES.narration, seed);
  return null;
}

/** "I didn't follow" — worded for questions vs statements, never repeated back-to-back. */
function fallbackReply(c: ConversationCase, text: string, state: DialogueState, previousReply: string | null): string {
  const asked = isQuestion(text) || text.trim().endsWith("?");
  const pool = asked || c.unknownReplies.length === 0 ? PATIENT_LINES.questionFallback : c.unknownReplies;
  let line = pickLine(pool, state.fallbackCount);
  if (previousReply?.includes(line)) line = pickLine(pool, state.fallbackCount + 1);
  state.fallbackCount += 1;
  return line;
}

function pendingPatientQuestion(c: ConversationCase, state: DialogueState): string | null {
  const invited = state.addressed.has("invite_questions") && state.pendingTopicId === c.patientQuestionTopicId;
  const concern = !state.holdSignalled && c.concernPromptUninformed ? c.concernPromptUninformed : c.concernPrompt;
  const prompt = invited ? c.patientQuestion
    : state.pendingTopicId === c.concernTopicId ? concern : null;
  if (!prompt) return null;
  return state.lastReply?.includes(prompt) ? `Could we come back to my question? ${prompt}` : prompt;
}

/** The patient's last reply asked whether the medicine is ready, so "yes" means it is. */
function askedIfReady(lastReply: string | null): boolean {
  return /\b(?:is|are)\b[^.?!]*\bready\b[^.?!]*\?|\bcan i\b[^.?!]*\bhome\b[^.?!]*\?/i.test(lastReply ?? "");
}

/** "What do you mean?" after the patient asked something: they reword their own question. */
function rephraseOwnQuestion(c: ConversationCase, lastReply: string | null): string | null {
  const straight = (value: string) => value.replace(/[’‘]/g, "'").trim();
  const asked = straight(lastReply ?? "").split(/(?<=[.!?])\s+/).filter(sentence => sentence.endsWith("?")).at(-1);
  if (!asked) return null;
  for (const [prompt, rephrased] of Object.entries(c.rephrasings ?? {})) {
    if (straight(prompt) === asked) return rephrased;
  }
  return `I just mean — ${/^I\b/.test(asked) ? asked : asked.charAt(0).toLowerCase() + asked.slice(1)}`;
}

/** One pure transition shared by live dialogue, resumed drafts and server grading. */
export function advanceConversation(c: ConversationCase, previous: DialogueState, raw: string) {
  const state: DialogueState = { ...previous, turns: previous.turns + 1, addressed: new Set(previous.addressed), evidence: { ...previous.evidence }, fragments: { ...previous.fragments }, unsafeAdvice: [...previous.unsafeAdvice], unresolvedAdviceIds: [...previous.unresolvedAdviceIds] };
  const repeatRequest = /^(?:(?:sorry|please) )?(?:(?:can|could|would) you (?:please )?)?(?:repeat (?:that|what you (?:said|just said))|say that (?:again|once more)|(?:i )?(?:did not|didn't) (?:hear|catch) that|(?:pardon|sorry)\??)(?: please)?[.!?]*$/.test(normalizeLanguage(raw));
  if (repeatRequest && previous.lastReply) {
    return { state, matchedTopicIds: [] as string[], unrecognised: false, reply: { text: previous.lastReply, audioSegments: [dynamicSegment(previous.lastReply)] } };
  }
  // Spelling is corrected once, for understanding only. Evidence and
  // unsafe-advice excerpts keep the student's exact words.
  const spelled = correctTypos(raw);
  const text = contextText(c, previous, spelled);
  const acts = readDialogueActs(spelled, previous.turns === 0 || askedIfReady(previous.lastReply));
  if (acts.name && !state.studentName) state.studentName = acts.name;
  if (acts.holdSignal) state.holdSignalled = true;
  // Told it was ready, then that it isn't: the patient notices, and their
  // concern about taking it home applies again.
  const retracted = acts.holdSignal && previous.supplyPromised;
  if (retracted) state.supplyPromised = false;

  let matchedTopicIds = classifyWithRules(c, text).map(m => m.topicId);
  const findings = [...findUnsafeAdvice(c, spelled), ...additionalSafety(c, spelled, acts)]
    .map(finding => ({ ...finding, excerpt: raw }));
  const partialIds: string[] = [];
  if (!findings.length && !isMetaStatement(text)) {
    for (const topic of c.topics.filter(t => t.requiredPatternGroups?.length && !matchedTopicIds.includes(t.id))) {
      const partialCase = { ...c, topics: [{ ...topic, requiredPatternGroups: [] }] };
      const normal = normalizeLanguage(text);
      const answersPending = state.pendingTopicId === topic.id && topic.requiredPatternGroups!.some(group => group.some(p => new RegExp(p, "i").test(normal)));
      if (!answersPending && !classifyWithRules(partialCase, text).length) continue;
      state.fragments[topic.id] = [...(state.fragments[topic.id] ?? []), raw].slice(-5);
      const combined = correctTypos(state.fragments[topic.id].join(". "));
      if (classifyWithRules({ ...c, topics: [topic] }, combined).length) {
        matchedTopicIds.push(topic.id);
      } else if (!state.addressed.has(topic.id)) partialIds.push(topic.id);
    }
  }
  const supplyPromiseOnly = findings.length > 0 && findings.every(f => f.id === SUPPLY_PROMISE.id);
  if (findings.length) {
    // Never praise a recognised instruction in the same turn as a conflicting
    // dose or dangerous recommendation. Keep the original evidence for review.
    matchedTopicIds = matchedTopicIds.filter(id => c.topics.find(t => t.id === id)?.category === "information_gathering");
    for (const finding of findings) {
      // A supply promise is recorded for assessment, but the patient does not
      // perceive a conflict, so it must not make them refuse teach-back.
      if (finding.id !== SUPPLY_PROMISE.id && !state.unresolvedAdviceIds.includes(finding.id)) state.unresolvedAdviceIds.push(finding.id);
      if (!state.unsafeAdvice.some(f => f.id === finding.id && f.excerpt === finding.excerpt)) state.unsafeAdvice.push(finding);
    }
    if (findings.some(f => f.id === "unverified_dose" || f.id === "double_dose")) {
      for (const topic of c.topics.filter(t => /directions|dose|admin/.test(t.id))) {
        state.addressed.delete(topic.id);
        delete state.fragments[topic.id];
      }
    }
  }
  if (acts.supplyStatement || findings.some(f => f.id === SUPPLY_PROMISE.id)) state.supplyPromised = true;
  if (!findings.length) {
    state.unresolvedAdviceIds = state.unresolvedAdviceIds.filter(id => {
      if (id === "unverified_dose") return !c.doseRules?.some(rule => matchedTopicIds.includes(rule.topicId));
      if (id === "double_dose") return !/\b(?:do not|never|must not)\b.{0,25}\bdouble\b/.test(normalizeLanguage(spelled));
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
  // Greet the student back — once, and by name when they gave it.
  const greets = (acts.greeting || acts.name !== null) && !previous.greeted;
  if (greets) {
    push(greetingReply(state.studentName, previous.turns, acts.howAreYou));
    state.greeted = true;
  }
  const question = normalizeLanguage(text);
  if ((isQuestion(text) || text.trim().endsWith("?"))
    && /(?:\b(?:is|are)\b.{0,40}\bready\b|\bcan i\b.{0,30}\b(?:give|supply|hand)\b.{0,30}\btoday\b)/.test(question)) {
    push("I was hoping you could tell me whether it's ready to collect.");
  }
  // React naturally to being told the medicine is ready. In a hold case the
  // unsafe promise is recorded above; the patient never hints at it.
  if (state.supplyPromised && !previous.supplyPromised) {
    push(pickLine(greets ? PATIENT_LINES.supplyReactionAfterGreeting : PATIENT_LINES.supplyReaction, state.turns));
  }
  // A new question or a complete topic takes precedence over an unfinished
  // counselling point from an earlier turn. Keep the fragments for later.
  if (!findings.length && partialIds.length && matchedTopicIds.length === 0 && !isQuestion(text)) {
    const id = state.pendingTopicId && partialIds.includes(state.pendingTopicId)
      ? state.pendingTopicId : partialIds[0];
    state.pendingTopicId = id;
    push(clarifyPartial(c, state, id));
  }
  const facts = matchedTopicIds.filter(id => c.topics.find(t => t.id === id)?.category === "information_gathering");
  const acknowledgement = /^(?:thanks?(?: you)?(?: for (?:letting me know|telling me|sharing that))?|okay|ok|i see|understood|sorry to hear that)[.!]*$/.test(normalizeLanguage(spelled));
  state.lastFactTopicId = facts.at(-1) ?? (acknowledgement ? previous.lastFactTopicId : null);
  if (findings.length && !supplyPromiseOnly) {
    push(findings.some(f => f.id === "unverified_dose")
      ? "That dose sounds different from the plan. Could you check the prescription and explain exactly how much and how often?"
      : "I'm confused about that advice. Could you check it against the prescription and explain the safe plan before I do anything?");
  }
  if (teachBackBlocked) push(state.unresolvedAdviceIds.length
    ? "Before I repeat the plan, I still need you to clear up the conflicting advice. What exactly should I follow?"
    : "Could you explain the plan first? Then I can tell you how I understand it.");
  const safeTopicIds = findings.length ? facts : matchedTopicIds;
  const invitation = patientInvitation(c, {
    supplyPromised: state.supplyPromised,
    holdSignalled: state.holdSignalled || state.addressed.has(c.concernTopicId),
  });
  if (safeTopicIds.length) {
    const unresolvedAdvice = state.unresolvedAdviceIds.length > 0 && safeTopicIds.includes("teach_back");
    if (unresolvedAdvice) push("Before I repeat the plan, I still need you to clear up the conflicting advice. What exactly should I follow?");
    // The greeting already answers a spoken introduction.
    const replyIds = safeTopicIds.filter(id => !(unresolvedAdvice && id === "teach_back") && !(greets && id === "introduction"));
    // The patient repeats back only what the student said for each topic.
    const heard = Object.fromEntries(replyIds.map(id => [id, [...new Set([...(state.fragments[id] ?? []), raw])]]));
    if (replyIds.length) responses.push(...buildPatientReply(c, replyIds, previous.addressed, state.turns, true, null, { heard, evidence: state.evidence, invitation }).audioSegments);
    if (safeTopicIds.includes("invite_questions")) {
      const questionTopic = c.patientQuestionTopicId ?? c.concernTopicId;
      if (invitation.kind === "concern" && !state.addressed.has(c.concernTopicId)) {
        state.pendingTopicId = c.concernTopicId;
        state.concernShown = true;
      } else if (invitation.kind === "question" && !state.addressed.has(questionTopic)) state.pendingTopicId = questionTopic;
    }
  }

  // Answer unscored history questions even when another clause scored a topic.
  // Specific intents take precedence over a generic "can I ask" preamble.
  const answeredIntents = new Set<string>();
  for (const clause of conversationClauses(text)) {
    if (isMetaStatement(clause)) continue;
    const normalized = normalizeLanguage(clause);
    const historyIntent = isQuestion(clause) ? c.responseIntents.find(i =>
      i.answerAlongsideTopics && i.fallbackPatterns.some(p => new RegExp(p, "i").test(normalized))) : null;
    if (c.caseId === "case-11" && historyIntent?.id === "current_symptoms"
      && partialIds.includes("toxicity_assessment")) continue;
    if (historyIntent && !answeredIntents.has(historyIntent.id)) {
      push(historyIntent.patientReplies[0]);
      answeredIntents.add(historyIntent.id);
    }
  }
  if (isQuestion(text) && !findings.length) {
    for (const id of partialIds) {
      const topic = c.topics.find(item => item.id === id);
      if (topic?.category !== "information_gathering") continue;
      if (id === "toxicity_assessment" && answeredIntents.has("illness_duration")) continue;
      if (id === "dose_factors" && answeredIntents.has("previous_apixaban_dose")) continue;
      for (const answer of topic.partialQuestionReplies ?? []) {
        if (new RegExp(answer.pattern, "i").test(question)) push(answer.reply);
      }
    }
  }
  // Told it was ready, then that it isn't. Alongside an explanation the patient
  // just notices the change; on its own they ask what's wrong.
  if (retracted) {
    if (responses.length) responses.unshift(dynamicSegment(PATIENT_LINES.readyRetracted[0]));
    else {
      push(PATIENT_LINES.readyRetracted[1]);
      if (c.concernTopicId === "explain_hold" && !state.addressed.has("explain_hold")) state.pendingTopicId = "explain_hold";
    }
  }
  // True only when the patient fell through to the generic "I didn't follow"
  // reply — the matcher recognised nothing in this turn, not even small talk.
  // Used to capture real student wording that needs a pattern (pilot corpus).
  let unrecognised = false;
  if (responses.length === 0 && /^(?:sorry[, ]*)?(?:what do you mean|what did you mean|what are you asking|what do you want to know|what exactly (?:do you mean|are you asking)|(?:can|could) you (?:explain|clarify) what you mean|(?:can|could) you clarify)\b/.test(question)) {
    const rephrased = rephraseOwnQuestion(c, previous.lastReply);
    if (rephrased) push(rephrased);
  }
  if (responses.length === 0 && state.pendingTopicId && /^(?:yes|no|sure|okay|ok|with a meal)[.! ]*$/.test(normalizeLanguage(text))) {
    push(pendingPatientQuestion(c, state) ?? "Could you explain what you mean for my medicine and what I should do? I need a little more detail.");
  }
  if (responses.length === 0 && isHoldCase(c) && isQuestion(text)
    && /\b(?:what happens next|what are the next steps)\b/.test(question)) {
    push(state.holdSignalled
      ? "I understand you're checking this, but I'm not sure when I'll hear back. Will you let me know?"
      : state.supplyPromised
        ? "I thought I could just take it home today — is that not right?"
        : "I'm not sure what happens next. Could you explain the plan to me?");
  }
  if (responses.length === 0 && c.caseId === "case-12" && !acts.holdSignal
    && /\b(?:yes|it is|this is)\b.{0,25}\b(?:higher|stronger) dose\b/.test(normalizeLanguage(text))) {
    push("My old box was 2.5 milligrams. Could you check whether the 5 milligram dose is right before I take it?");
  }
  if (responses.length === 0 && c.caseId === "case-12" && state.holdSignalled
    && /^(?:yes|okay|ok|sure)[, ]+(?:i|we) will (?:check|review|confirm) (?:it|that|the dose)[.! ]*$/.test(normalizeLanguage(text))) {
    push("Thank you. Please let me know once you've checked the dose with my doctor.");
  }
  if (responses.length === 0) {
    const social = socialReply(c, acts, state.turns);
    if (social) {
      push(social);
      // "Is there a problem with it?" makes the hold explanation the thing the patient is waiting on.
      if (acts.holdSignal && c.concernTopicId === "explain_hold" && !state.addressed.has("explain_hold")) state.pendingTopicId = "explain_hold";
    }
  }
  if (responses.length === 0) {
    const intent = isMetaStatement(text) ? null : matchResponseIntent(c, text);
    if (intent && !["dosing_instruction", "affirmative_answer", "negative_answer", "wrong_dosage_form_advice"].includes(intent.id)) {
      push(intent.patientReplies[state.turns % intent.patientReplies.length]);
    } else {
      unrecognised = !isMetaStatement(text);
      push(!isQuestion(text) && !isMetaStatement(text)
        ? pendingPatientQuestion(c, state) ?? fallbackReply(c, text, state, previous.lastReply)
        : fallbackReply(c, text, state, previous.lastReply));
    }
  }
  if (state.pendingTopicId && matchedTopicIds.includes(state.pendingTopicId)) state.pendingTopicId = null;
  // "No, that covers everything" is never followed by a fresh concern.
  const concernWaits = responses.some(s => s.text.includes("?")) || invitation.kind === "none" && safeTopicIds.includes("invite_questions");
  // The patient raises their concern from what has actually been said, not on
  // a timer: never "why can't I collect it?" before being told they can't, and
  // not at all once told (wrongly) that it's ready.
  const concernMoot = state.supplyPromised && Boolean(c.concernAboutCollecting);
  if (!findings.length && !state.concernShown && state.turns >= c.concernAfterTurns
    && !state.addressed.has(c.concernTopicId) && !concernWaits
    && !matchedTopicIds.includes("teach_back") && !concernMoot
    && !(c.caseId === "case-11" && answeredIntents.has("current_symptoms"))) {
    push(!state.holdSignalled && c.concernPromptUninformed ? c.concernPromptUninformed : c.concernPrompt);
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
