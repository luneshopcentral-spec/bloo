import { conversationClauses, isMetaStatement, isQuestion, negatedAction, normalizeLanguage } from "./language";

/**
 * Case-independent dialogue acts: the *kind* of thing a student said, read
 * before any case-specific topic matching. These drive how naturally the
 * patient responds (greeting back by name, reacting to "it's ready", small
 * talk). They never award marks by themselves; the only assessment effect is
 * that telling a hold-case patient the medicine is ready is recorded as an
 * unsafe supply promise by the engine.
 *
 * Everything here is pure and deterministic, so the live patient and the
 * server-side marking always read a message the same way.
 */
export interface DialogueActs {
  greeting: boolean;
  /** The student's own name, when they introduced themselves. */
  name: string | null;
  howAreYou: boolean;
  niceToMeet: boolean;
  /** "One moment", "let me check that" — procedural talk, not counselling. */
  narration: boolean;
  waitThanks: boolean;
  thanksOnly: boolean;
  okayOnly: boolean;
  sympathy: boolean;
  /** An unconditional statement that the medicine is ready / being handed over. */
  supplyStatement: boolean;
  /**
   * The student signalled the supply is delayed or on hold — including a bare
   * "no / not yet" answering the patient's opening "is it ready?".
   */
  holdSignal: boolean;
}

const NOT_A_NAME = new Set([
  "the", "a", "an", "your", "you", "just", "going", "gonna", "here", "sorry", "not", "so", "very",
  "really", "happy", "glad", "afraid", "sure", "one", "from", "with", "pharmacist", "pharmacy",
  "student", "intern", "now", "also", "still", "currently", "today", "back", "about", "able",
  "unable", "new", "fine", "good", "well", "ok", "okay", "all", "only", "aware", "unsure", "ready",
  "done", "busy", "free", "available", "in", "on", "at", "of", "to", "for", "it", "that", "this",
  "what", "who", "how", "and", "but", "or", "if", "then", "there", "their", "nearly", "almost",
  "pretty", "quite", "bit", "little", "around", "responsible", "dr", "doctor", "mr", "mrs", "ms",
  "miss", "unfortunately", "actually", "afraid", "hoping", "worried", "concerned",
]);

function extractName(n: string): string | null {
  const match = /\bmy name(?: is|'s)\s+([a-z][a-z'-]{1,19})\b/.exec(n) ?? /\b(?:i am|im)\s+([a-z][a-z'-]{1,19})\b/.exec(n);
  if (!match) return null;
  const word = match[1];
  if (NOT_A_NAME.has(word)) return null;
  // "I'm checking", "I'm concerned", "I'm really…" are not names.
  if (word.length >= 5 && /(?:ing|ed|ly)$/.test(word)) return null;
  return word[0].toUpperCase() + word.slice(1);
}

const SUPPLY_OBJECT = String.raw`(?:medicine|antibiotics?|tablets?|capsules?|prescription|script|repeat|order|patch(?:es)?|mixture|liquid|bottle|box|pack|pills?|puffer|inhaler|cream|drops|syrup|supply)`;

const SUPPLY_PATTERNS = [
  // "your antibiotics are ready", "the prescription is all done", "his mixture is here"
  new RegExp(String.raw`\b(?:your|the|his|her|their|this|these|those)\s+(?:[a-z]+\s+){0,2}?${SUPPLY_OBJECT}\s+(?:is|are|has been|have been)\s+(?:now\s+|all\s+)?(?:ready|done|all set|good to go|here)\b`),
  // "your erythromycin is ready", "his amoxicillin is ready" — any named medicine.
  /\b(?:your|his|her)\s+(?:[a-z']+\s+){0,3}?(?:is|are)\s+(?:now\s+|all\s+)?ready\b/,
  // "it's ready", "they are ready for you"
  /\b(?:it|they|these|everything)\s+(?:is|are)\s+(?:now\s+|all\s+)?(?:ready|good to go)\b/,
  /\bthey're\s+(?:now\s+|all\s+)?(?:ready|good to go)\b/,
  /\bhere (?:you go|you are|it is|they are)\b/,
  /\bhere(?:'s| is) your\b/,
  /\b(?:i|we)(?: will)?\s+(?:just\s+)?(?:get|grab|bring|pack|bag)\s+(?:it|that|them|this|these|your\s+[a-z]+)\s+(?:for you|ready|up for you)\b/,
  /\b(?:i|we) will\s+(?:just\s+)?(?:hand|give)\s+(?:it|them|this|these|your\s+[a-z]+)\s+(?:over|to you)\b/,
  /\byou can (?:pick up|collect)\s+(?:it|them|this|these|your\s+[a-z]+)\b/,
  /\byou can (?:take|have)\s+(?:it|them|this|these|your\s+[a-z]+)\s+(?:home|with you)\b/,
  /\b(?:i will|we will|we can)\s+(?:now\s+)?(?:supply|dispense|give you)\b/,
];

// A statement that the supply depends on something first is not a promise.
const CONDITIONAL = /\b(?:if|after|once|until|before|when|unless|confirm(?:s|ed)?)\b/;

const HOLD_PATTERNS = [
  /\b(?:cannot|can not|unable to|not able to|will not|not going to|not allowed to)\s+(?:be able to\s+)?(?:give|supply|dispense|hand|release|let you (?:have|take))\b/,
  /\b(?:holding (?:it|this|them|onto|on to|the|your)|hold (?:it|this|them|onto|on to|the|your|off)|on hold|hang on to (?:it|this|them|the|your))\b/,
  /\b(?:too early|too soon|ahead of schedule|not (?:yet )?due|early repeat|a bit early|a little early)\b/,
  /\b(?:is|are) not (?:quite )?(?:ready|available)\b/,
  /\bnot (?:quite |just )?ready\b/,
  /\bbefore (?:i|we) (?:can )?(?:dispense|supply|give|hand)\b/,
  /\b(?:need|have|got|going) to (?:check|call|contact|speak|talk|confirm|clarify|ring|phone|verify|query)\b.*\b(?:doctor|prescriber|clinic|surgery)\b/,
  /\b(?:let me|i will|i am going to)\s+(?:just\s+)?(?:call|ring|phone|contact|check with|speak (?:to|with)|talk to)\s+(?:your|the)\s+(?:doctor|prescriber|clinic)\b/,
  /\b(?:need to|have to|will have to|going to have to|might have to|may have to)\s+wait\b/,
  /\bthere (?:is|will be|might be|may be) (?:a |going to be a )?(?:short |small |slight |bit of a )?(?:delay|problem|issue)\b/,
  /\b(?:problem|issue|concern) with (?:the|your|this|his|her) (?:prescription|script|repeat|dose|medicine)\b/,
];

function statementClauses(text: string): string[] {
  return conversationClauses(text).filter(clause => !isQuestion(clause) && !clause.trim().endsWith("?") && !isMetaStatement(clause));
}

export function signalsHold(text: string): boolean {
  return statementClauses(text).some(clause => {
    const n = normalizeLanguage(clause);
    return HOLD_PATTERNS.some(pattern => pattern.test(n));
  });
}

export function promisesSupply(text: string): boolean {
  return statementClauses(text).some(clause => {
    const n = normalizeLanguage(clause);
    if (CONDITIONAL.test(n)) return false;
    return SUPPLY_PATTERNS.some(pattern => {
      const match = pattern.exec(n);
      return Boolean(match) && !negatedAction(n, match!.index);
    });
  });
}

/**
 * Read the dialogue acts in one student message. `isOpeningReply` is true for
 * the first student message, which answers the patient's "is it ready yet?".
 */
export function readDialogueActs(text: string, isOpeningReply: boolean): DialogueActs {
  const n = normalizeLanguage(text);
  const holdSignal = signalsHold(text)
    || (isOpeningReply && /^(?:(?:sorry|unfortunately|um|oh|well|ah)[, ]+)?(?:no|nope|not yet|not quite|not just yet|not quite yet)\b/.test(n));
  const openingYes = isOpeningReply
    && /^(?:yes|yep|yeah|yup|sure|of course|certainly)\b(?:[,.! ]+(?:it is|they are|they're|all ready|ready|here you go|here it is))?[.! ]*$/.test(n);
  return {
    greeting: /^(?:(?:oh|um|uh|so|well|and)[, ]+)?(?:hi|hello|hey|hiya|howdy|g'?day|good (?:morning|afternoon|evening|day))\b/.test(n),
    name: extractName(n),
    howAreYou: /\bhow (?:are|r) (?:you|u)\b(?! (?:taking|using|feeling|managing|finding|going to|getting on))/.test(n)
      || /\bhow is it going\b|\bhow have you been\b(?! (?:taking|using|feeling))/.test(n),
    niceToMeet: /\b(?:nice|good|lovely|great|a pleasure|pleasure) (?:to meet you|meeting you)\b/.test(n),
    narration: /^(?:(?:okay|ok|right|alright|all right|sure|great|perfect)[, ]+)?(?:let me|i will just|i am just going to|i am going to just|just going to|one (?:moment|sec(?:ond)?|minute)|just a (?:moment|minute|sec(?:ond)?)|give me (?:a|one) (?:moment|minute|sec(?:ond)?)|bear with me|hang on|hold on|almost|nearly|just about)\b/.test(n),
    waitThanks: /\b(?:thanks|thank you) for (?:waiting|your patience|being patient|bearing with me)\b|\bsorry (?:about|for) (?:the|your) (?:wait|delay)\b|\bsorry to (?:keep|have kept) you waiting\b/.test(n),
    thanksOnly: /^(?:thanks|thank you|cheers|ta)(?: (?:so much|very much|heaps|for (?:that|letting me know|telling me|sharing that)))?[.! ]*$/.test(n),
    okayOnly: /^(?:okay|ok|alright|all right|i see|understood|right|got it|sure|great|good|perfect|no worries|no problem|lovely|awesome|cool)[.! ]*$/.test(n),
    sympathy: /^(?:oh[, ]+)?(?:i am )?sorry to hear (?:that|about that)[.! ]*$|^that (?:must be|sounds) (?:hard|difficult|tough|rough|frustrating)\b/.test(n),
    supplyStatement: !holdSignal && (openingYes || promisesSupply(text)),
    holdSignal,
  };
}

function pick(lines: readonly string[], seed: number): string {
  return lines[((seed % lines.length) + lines.length) % lines.length];
}

/** The patient's greeting back — by name when the student gave one. */
export function greetingReply(name: string | null, seed: number, howAreYou: boolean): string {
  const base = name
    ? pick([`Hi ${name}, nice to meet you.`, `Hello ${name}, nice to meet you.`, `Hi ${name}.`], seed)
    : pick(["Hi there.", "Hello.", "Hi."], seed);
  return howAreYou ? `${base} I'm alright, thanks.` : base;
}

export const PATIENT_LINES = {
  greetAgain: ["Hi again.", "Hello again."],
  howAreYou: ["I'm alright, thanks.", "Not too bad, thanks."],
  niceToMeet: ["Nice to meet you too."],
  narration: ["Sure, no problem.", "Okay, take your time.", "Sure."],
  waitThanks: ["That's okay.", "No problem at all."],
  thanks: ["You're welcome.", "No worries."],
  okay: ["Okay.", "Mm-hm.", "Sure."],
  sympathy: ["Thanks."],
  // A realistic reaction only — the patient never hints that supply is unsafe.
  supplyReaction: ["Oh great, thanks!", "Oh good, thank you.", "Great, thanks for that."],
  supplyReactionAfterGreeting: ["Great, thanks.", "Good, thank you."],
  // The student said it isn't ready / is on hold, without explaining why yet.
  holdReactionHold: ["Oh — is there a problem with it?", "Oh, okay. Is something wrong?", "Oh, why's that?"],
  holdReactionDispense: ["Oh, okay. Will it be long?", "No worries. How long will it be?"],
  questionFallback: [
    "Sorry, I'm not sure what you're asking. Could you put that another way?",
    "I'm not quite sure what you mean — what would you like to know?",
    "Sorry, could you ask me that a bit differently?",
  ],
} as const;

export { pick as pickLine };
