import { describe, expect, it } from "vitest";
import { getConversationCase } from "./cases";
import { advanceConversation, createDialogueState, evaluateConversation } from "./engine";

const c = getConversationCase("case-1");
describe("natural student wording", () => {
  it.each([
    ["Before we begin, may I have your full name please?", "confirm_identity"],
    ["Your name?", "confirm_identity"],
    ["And your birthday?", "confirm_age"],
    ["I was wondering if you have any allergies?", "allergies"],
    ["Has a medication ever caused you a bad reaction?", "allergies"],
    ["Are you allergic to anything?", "allergies"],
    ["Could you please run through the medications you currently use?", "current_medicines"],
    ["What do you take day to day?", "current_medicines"],
    ["Do you use anything bought over-the-counter?", "current_medicines"],
    ["This repeat is ahead of schedule, so I can't hand it over until I've spoken to your GP.", "explain_hold"],
    ["It's too soon for another supply. I'll ring your doctor before dispensing it.", "explain_hold"],
    ["Once I hear back from your doctor I'll phone you with the outcome.", "next_steps"],
  ])("recognises %s", (text, topic) => {
    expect(advanceConversation(c, createDialogueState(), text).matchedTopicIds).toContain(topic);
  });

  it.each(["What is this antibiotic for?", "Have you been taking one capsule four times a day?", "Are you going to finish the course?", "Could you tell me if you take one capsule four times a day?", "I was wondering whether you finish the course?"])("does not award counselling for asking history: %s", text => {
    const turn = advanceConversation(c, createDialogueState(), text);
    expect(turn.matchedTopicIds.filter(id => c.topics.find(t => t.id === id)?.category === "clinical_counselling")).toEqual([]);
  });

  it("keeps an unanswered patient concern when questions are invited again", () => {
    const first = advanceConversation(c, createDialogueState(), "Do you have any questions?");
    const second = advanceConversation(c, first.state, "Do you have any questions?");
    expect(second.reply.text).toBe(first.reply.text);
    expect(second.state.pendingTopicId).toBe(c.patientQuestionTopicId ?? c.concernTopicId);
  });

  it("keeps history context over an acknowledgement", () => {
    let t = advanceConversation(c, createDialogueState(), "Any allergies?");
    t = advanceConversation(c, t.state, "Thanks for letting me know.");
    t = advanceConversation(c, t.state, "Sorry, which medicine was that again?");
    expect(t.reply.text).toMatch(/penicillin/i);
  });

  it("repeats its last answer without inventing new facts or marks", () => {
    const first = advanceConversation(c, createDialogueState(), "What medicines do you take?");
    const next = advanceConversation(c, first.state, "Could you repeat that please?");
    expect(next.reply.text).toBe(first.reply.text);
    expect(next.matchedTopicIds).toEqual([]);
  });

  it("does not answer a course question as an unrelated allergy check", () => {
    const t = advanceConversation(c, createDialogueState(), "When did you last collect this antibiotic?");
    expect(t.reply.text).toMatch(/recent|repeat/i);
    expect(t.matchedTopicIds).not.toContain("allergies");
  });

  it("accepts a corrected dose for dialogue but retains the safety incident in assessment", () => {
    const texts = ["Take five capsules three times a day.", "Sorry, that was incorrect. If the prescriber confirms supply, take one capsule four times a day.", "Can you repeat the plan in your own words?"];
    let t = advanceConversation(c, createDialogueState(), texts[0]);
    t = advanceConversation(c, t.state, texts[1]);
    t = advanceConversation(c, t.state, texts[2]);
    expect(t.reply.text).not.toContain("conflicting advice");
    expect(t.reply.text).toMatch(/one|1/i);
    const result = evaluateConversation(c, texts.map((text, i) => ({ id: String(i), role: "student", text })));
    expect(result.unsafeAdvice.length).toBeGreaterThan(0);
    expect(result.passed).toBe(false);
  });
});
