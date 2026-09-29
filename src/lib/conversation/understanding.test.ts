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
function measure(shared?: PhrasingBank, byCase?: Record<string, PhrasingBank>): Outcome[] {
  return cases.flatMap((c) =>
    bankFor(c, shared, byCase).says.flatMap(([topicId, lines]) => lines.map((text) => ({
      caseId: c.caseId, topicId, text, understood: said(c, text, topicId).matchedTopicIds.includes(topicId),
    }))));
}
const outcomes = measure();
// Wording never used to tune the rules: how understanding generalises.
const heldOut = measure(HELD_OUT_SHARED, HELD_OUT_CASES);

function recall(rows: Outcome[]): number {
  return rows.length ? rows.filter((row) => row.understood).length / rows.length : 1;
}

// Optional report for tuning: UNDERSTANDING_REPORT=path npx vitest run understanding
if (process.env.UNDERSTANDING_REPORT) {
  const lines = [
    `Overall: ${(recall(outcomes) * 100).toFixed(1)}% of ${outcomes.length} wordings understood`,
    `Held out: ${(recall(heldOut) * 100).toFixed(1)}% of ${heldOut.length} unseen wordings understood`,
    ...heldOut.filter((row) => !row.understood).map((row) => `  HELD-OUT MISS ${row.caseId} ${row.topicId}: ${row.text}`),
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
      for (const text of lines) {
        const turn = said(c, text);
        expect(turn.state.addressed.has(topicId), `${caseId} ${topicId}: "${text}"`).toBe(false);
      }
    }
  });
});
