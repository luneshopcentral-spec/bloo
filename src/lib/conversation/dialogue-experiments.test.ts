import { describe, expect, it } from "vitest";
import { CONVERSATION_CASES, getConversationCase } from "./cases";
import { advanceConversation, createDialogueState } from "./engine";

function exchange(caseId: string, lines: string[]) {
  const c = getConversationCase(caseId);
  let state = createDialogueState();
  return lines.map(line => {
    const turn = advanceConversation(c, state, line);
    state = turn.state;
    return turn;
  });
}

describe("conversation experiments from natural counter language", () => {
  it.each(Object.keys(CONVERSATION_CASES))("keeps the volunteered patient question tied to its actual topic in %s", caseId => {
    const c = getConversationCase(caseId);
    expect(c.topics.some(topic => topic.id === c.patientQuestionTopicId)).toBe(true);
  });

  it("understands a supply hold followed by the intended check", () => {
    const [turn] = exchange("case-12", ["I cannot supply the new dose before I check it with your doctor."]);
    expect(turn.matchedTopicIds).toContain("explain_hold");
    expect(turn.state.unsafeAdvice).toEqual([]);
  });

  it("answers lithium illness and ibuprofen questions separately before crediting the complete assessment", () => {
    const [illness, ibuprofen] = exchange("case-11", ["Have you been vomiting or had diarrhoea?", "Have you taken ibuprofen?"]);
    expect(illness.reply.text).toMatch(/vomit|diarrhoea/i);
    expect(illness.reply.text).not.toMatch(/ibuprofen/i);
    expect(illness.matchedTopicIds).not.toContain("toxicity_assessment");
    expect(ibuprofen.reply.text).toMatch(/ibuprofen/i);
    expect(ibuprofen.matchedTopicIds).toContain("toxicity_assessment");
  });

  it("answers Eliquis dose-factor questions with only the facts requested until the full history is collected", () => {
    const [weight, kidneys, indication] = exchange("case-12", ["Do you know your weight?", "What is your kidney result?", "Why do you take Eliquis?"]);
    expect(weight.reply.text).toMatch(/54 kilograms/i);
    expect(weight.reply.text).not.toMatch(/creatinine|atrial fibrillation/i);
    expect(weight.matchedTopicIds).not.toContain("dose_factors");
    expect(kidneys.reply.text).toMatch(/168/i);
    expect(kidneys.matchedTopicIds).not.toContain("dose_factors");
    expect(indication.reply.text).toMatch(/atrial fibrillation|heart rhythm/i);
    expect(indication.matchedTopicIds).toContain("dose_factors");
  });

  it.each([
    ["case-1", "Why did you come in early?", /four days ago/i],
    ["case-2", "Do you take ibuprofen?", /ibuprofen.*headaches/i],
    ["case-3", "What is he being treated for?", /infection/i],
    ["case-3", "How long has he been ill?", /not sure of the exact/i],
    ["case-7", "Have you had any side effects?", /awake|drowsy/i],
    ["case-11", "What symptoms are you having?", /vomit/i],
    ["case-11", "How long have you had vomiting?", /two days ago/i],
    ["case-12", "What was your previous dose?", /2\.5 milligrams/i],
    ["case-13", "What are your conditions?", /type 2 diabetes/i],
  ])("answers %s: %s", (caseId, question, expected) => {
    const [turn] = exchange(caseId as string, [question as string]);
    expect(turn.reply.text).toMatch(expected as RegExp);
    expect(turn.unrecognised).toBe(false);
  });

  it("asks a meaningful follow-up rather than a repeat-specific prompt in different hold cases", () => {
    const prompts: Array<[string, string, RegExp]> = [
      ["case-8", "I need to check the prescription with your doctor before you collect it.", /patch|safety concern/i],
      ["case-9", "I cannot supply this until I verify the prescriber.", /prescriber details/i],
      ["case-10", "I cannot give this today because it says daily; I need to confirm the weekly schedule with your doctor.", /daily direction/i],
    ];
    for (const [caseId, statement, expected] of prompts) {
      const [turn] = exchange(caseId, [statement]);
      expect(turn.reply.text, caseId).toMatch(expected);
      expect(turn.matchedTopicIds, caseId).not.toContain("explain_hold");
    }
  });

  it("answers a pharmacy status question after a greeting without inventing supply status", () => {
    const [turn] = exchange("case-1", ["Hello, are the antibiotics ready?"]);
    expect(turn.reply.text).toMatch(/hoping you could tell me/i);
    expect(turn.state.unsafeAdvice).toEqual([]);
    expect(turn.unrecognised).toBe(false);
  });

  it("asks the separate sun question after antacid advice is complete", () => {
    const [antacid, question] = exchange("case-6", [
      "Keep your antacid two hours away from the doxycycline.",
      "What would you like to know?",
    ]);
    expect(antacid.matchedTopicIds).toContain("separation");
    expect(question.reply.text).toMatch(/sun/i);
    expect(question.state.pendingTopicId).toBe("sun_precautions");
  });

  it("returns to the patient's unanswered question after an unrelated statement", () => {
    const [invitation, offTopic] = exchange("case-2", [
      "Do you have any questions?",
      "I will check the antibiotics against your warfarin before you use them.",
    ]);
    expect(invitation.reply.text).toMatch(/signs of bleeding/i);
    expect(offTopic.reply.text).toMatch(/signs of bleeding/i);
    expect(offTopic.reply.text).not.toMatch(/not sure what you mean|explain the rest/i);
    expect(offTopic.matchedTopicIds).not.toContain("bleeding_safety");
  });
});
