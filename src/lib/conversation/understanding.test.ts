import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONVERSATION_CASES } from "./cases";
import { advanceConversation, createDialogueState } from "./engine";
import { CASE_PHRASINGS, SHARED_PHRASINGS, type PhrasingBank } from "./phrasings";
import { HELD_OUT_CASES, HELD_OUT_SHARED } from "./phrasings-held-out";
import type { ConversationCase } from "./types";

/**
 * The conversation's understanding scorecard: every realistic wording in the
 * phrasing bank, said to the real engine mid-conversation. Recall is how often
 * the patient understood the point being made; a `mustNot` near-miss earning
 * credit is always a failure.
 */
interface Outcome {
  caseId: string;
  topicId: string;
  text: string;
  understood: boolean;
  /** Correct advice must never be recorded as unsafe. */
  flagged: boolean;
}

// What a speech recogniser hands back for the same words: no punctuation,
// counts as digits ("take 1 capsule 4 times a day"), and shorthand spoken in
// full — nobody says "qid" or "ur" aloud.
const NUMBER_DIGITS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8",
  nine: "9", ten: "10", eleven: "11", twelve: "12", twenty: "20", thirty: "30",
};
const SPOKEN_FORMS: Array<[RegExp, string]> = [
  [/\bqid\b/gi, "four times a day"], [/\btds\b/gi, "three times a day"], [/\bbd\b/gi, "twice a day"],
  [/\btabs?\b/gi, "tablet"], [/\bcaps?\b/gi, "capsule"], [/\bdob\b/gi, "date of birth"],
  [/\bu\b/gi, "you"], [/\bur\b/gi, "your"], [/\bdr\b/gi, "doctor"], [/\bill\b/gi, "I'll"], [/\bpls\b/gi, "please"],
  [/\bhrs?\b/gi, "hours"], [/\bmins\b/gi, "minutes"], [/\b(\d+)\s*mls?\b/gi, "$1 ml"],
];
function spoken(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SPOKEN_FORMS) out = out.replace(pattern, replacement);
  out = out.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty)\b/gi, (word) => NUMBER_DIGITS[word.toLowerCase()]);
  return out.replace(/[.,!?;:"()…]|\s[—–-]\s|—|–/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function warmState(c: ConversationCase) {
  return advanceConversation(c, createDialogueState(), "Hi, I'm Sam, the pharmacist.").state;
}

// Teach-back is only asked for once something has been explained.
function counselledState(c: ConversationCase) {
  const explained = c.topics.find((topic) => topic.category === "clinical_counselling" || topic.category === "safety_netting")!;
  return advanceConversation(c, warmState(c), explained.examples[0]).state;
}

function said(c: ConversationCase, text: string, topicId?: string) {
  return advanceConversation(c, topicId === "teach_back" ? counselledState(c) : warmState(c), text);
}

function bankFor(c: ConversationCase, shared: PhrasingBank = SHARED_PHRASINGS, byCase: Record<string, PhrasingBank> = CASE_PHRASINGS) {
  const topics = new Set(c.topics.map((topic) => topic.id));
  const own = byCase[c.caseId] ?? { says: {} };
  const says = Object.entries({ ...shared.says, ...own.says }).filter(([id]) => topics.has(id));
  return { says, mustNot: Object.entries(own.mustNot ?? {}) };
}

const cases = Object.values(CONVERSATION_CASES);
function measure(shared?: PhrasingBank, byCase?: Record<string, PhrasingBank>, form: (text: string) => string = (text) => text): Outcome[] {
  return cases.flatMap((c) =>
    bankFor(c, shared, byCase).says.flatMap(([topicId, lines]) => lines.map((line) => {
      const text = form(line);
      const turn = said(c, text, topicId);
      return { caseId: c.caseId, topicId, text, understood: turn.matchedTopicIds.includes(topicId), flagged: turn.state.unsafeAdvice.length > 0 };
    })));
}
const outcomes = measure();
// Wording never used to tune the rules: how understanding generalises.
const heldOut = measure(HELD_OUT_SHARED, HELD_OUT_CASES);
// The same wordings as the speech recogniser would transcribe them.
const spokenOutcomes = measure(SHARED_PHRASINGS, CASE_PHRASINGS, spoken);
const spokenHeldOut = measure(HELD_OUT_SHARED, HELD_OUT_CASES, spoken);

function recall(rows: Outcome[]): number {
  return rows.length ? rows.filter((row) => row.understood).length / rows.length : 1;
}

// Optional report for tuning: UNDERSTANDING_REPORT=path npx vitest run understanding
if (process.env.UNDERSTANDING_REPORT) {
  const lines = [
    `Overall: ${(recall(outcomes) * 100).toFixed(1)}% of ${outcomes.length} wordings understood`,
    `Held out: ${(recall(heldOut) * 100).toFixed(1)}% of ${heldOut.length} unseen wordings understood`,
    `Spoken: ${(recall(spokenOutcomes) * 100).toFixed(1)}% · spoken held out: ${(recall(spokenHeldOut) * 100).toFixed(1)}%`,
    ...heldOut.filter((row) => !row.understood).map((row) => `  HELD-OUT MISS ${row.caseId} ${row.topicId}: ${row.text}`),
    ...[...spokenOutcomes, ...spokenHeldOut].filter((row) => !row.understood).map((row) => `  SPOKEN MISS ${row.caseId} ${row.topicId}: ${row.text}`),
    ...[...outcomes, ...heldOut, ...spokenOutcomes, ...spokenHeldOut].filter((row) => row.flagged).map((row) => `  FLAGGED UNSAFE ${row.caseId} ${row.topicId}: ${row.text}`),
  ];
  for (const c of cases) {
    const rows = outcomes.filter((row) => row.caseId === c.caseId);
    lines.push(`\n${c.caseId}: ${(recall(rows) * 100).toFixed(0)}%`);
    for (const row of rows.filter((item) => !item.understood)) lines.push(`  MISSED ${row.topicId}: ${row.text}`);
  }
  writeFileSync(process.env.UNDERSTANDING_REPORT, lines.join("\n"));
}

describe("understanding scorecard", () => {
  it("understands the realistic wordings in the phrasing bank", () => {
    expect(outcomes.length).toBeGreaterThan(2000);
    expect(recall(outcomes)).toBeGreaterThanOrEqual(0.99);
  });

  it("generalises to held-out wording it was never tuned on", () => {
    expect(heldOut.length).toBeGreaterThan(200);
    expect(recall(heldOut)).toBeGreaterThanOrEqual(0.9);
  });

  it.each(cases.map((c) => c.caseId))("%s: understands every critical topic's wordings", (caseId) => {
    const c = CONVERSATION_CASES[caseId];
    for (const topic of c.topics.filter((item) => item.critical)) {
      const rows = outcomes.filter((row) => row.caseId === caseId && row.topicId === topic.id);
      const missed = rows.filter((row) => !row.understood).map((row) => row.text);
      expect(missed, `${caseId} ${topic.id}`).toEqual([]);
    }
  });

  it.each(cases.map((c) => c.caseId))("%s: never credits a near-miss", (caseId) => {
    const c = CONVERSATION_CASES[caseId];
    for (const [topicId, lines] of bankFor(c).mustNot) {
      for (const text of [...lines, ...lines.map(spoken)]) {
        const turn = said(c, text);
        expect(turn.state.addressed.has(topicId), `${caseId} ${topicId}: "${text}"`).toBe(false);
      }
    }
  });

  it("never records correct advice as unsafe, typed or spoken", () => {
    const flagged = [...outcomes, ...heldOut, ...spokenOutcomes, ...spokenHeldOut].filter((row) => row.flagged);
    expect(flagged.map((row) => `${row.caseId} ${row.topicId}: ${row.text}`)).toEqual([]);
  });
});

describe("spoken transcripts", () => {
  it("understands speech-recogniser output as well as typing", () => {
    expect(recall(spokenOutcomes)).toBeGreaterThanOrEqual(0.99);
    expect(recall(spokenHeldOut)).toBeGreaterThanOrEqual(0.95);
  });

  it("reads a dose spoken with digits as the same dose", () => {
    const c1 = CONVERSATION_CASES["case-1"];
    const turn = said(c1, "take 1 capsule 4 times a day");
    expect(turn.matchedTopicIds).toContain("directions");
    expect(turn.state.unsafeAdvice).toEqual([]);
    expect(said(c1, "take 2 capsules 4 times a day").state.unsafeAdvice.map((f) => f.id)).toContain("unverified_dose");
    expect(said(CONVERSATION_CASES["case-3"], "give him 10 ml 3 times a day for 10 days").state.unsafeAdvice).toEqual([]);
  });

  it.each([
    "your antibiotics are ready do you have any questions",
    "do you have any allergies your antibiotics are ready",
    "any questions it's all ready for you",
  ])("still hears 'it's ready' run together with a question: %s", (text) => {
    expect(said(CONVERSATION_CASES["case-1"], text).state.unsafeAdvice.map((f) => f.id)).toContain("supply_before_clarification");
  });

  it.each([
    "let me check your medicine is ready",
    "can i check whether your antibiotics are ready",
    "is your medicine ready do you know",
  ])("does not treat asking about readiness as a promise: %s", (text) => {
    expect(said(CONVERSATION_CASES["case-1"], text).state.unsafeAdvice).toEqual([]);
  });

  it("answers each question in an unpunctuated run", () => {
    const turn = said(CONVERSATION_CASES["case-2"], "can i confirm your name and date of birth do you have any allergies");
    expect(turn.matchedTopicIds).toEqual(expect.arrayContaining(["confirm_identity", "confirm_age", "allergies"]));
  });
});
