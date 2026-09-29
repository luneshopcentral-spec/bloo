import { describe, expect, it } from "vitest";
import { getConversationCase } from "./cases";
import { advanceConversation, createDialogueState } from "./engine";

function conversation(caseId: string, messages: string[]) {
  const c = getConversationCase(caseId);
  let state = createDialogueState();
  return messages.map(message => {
    const turn = advanceConversation(c, state, message);
    state = turn.state;
    return turn;
  });
}

describe("student pilot wording", () => {
  it("answers a new medicine question instead of repeating an unfinished warfarin prompt", () => {
    const turns = conversation("case-2", [
      "Hi there",
      "Any allergies?",
      "What is your name and age",
      "No avoid that please",
      "Avoid alcohol and antibiotics",
      "Do you take any other medication",
    ]);
    expect(turns[2].reply.text).toMatch(/Margaret Jones.*22 June 1948/);
    expect(turns[2].reply.text).toMatch(/ibuprofen/i);
    expect(turns[3].reply.text).toMatch(/ibuprofen/i);
    expect(turns[4].reply.text).not.toBe(turns[3].reply.text);
    expect(turns[4].reply.text).toMatch(/antibiotic/i);
    expect(turns[5].reply.text).toMatch(/warfarin/i);
    expect(turns[5].reply.text).not.toMatch(/explain the rest/i);
    expect(turns[3].matchedTopicIds).not.toContain("interactions");
    expect(turns[4].matchedTopicIds).not.toContain("interactions");
  });

  it("answers combined identity, address and illness history without duplicating symptoms", () => {
    const turns = conversation("case-11", [
      "hi what is your name and date of birth?",
      "what is your adress",
      "how long have you had a stomach bug",
      "what are your symptoms",
    ]);
    expect(turns[0].matchedTopicIds).toEqual(expect.arrayContaining(["confirm_identity", "confirm_age"]));
    expect(turns[0].reply.text).toMatch(/Rahul Mehta.*29 January 1982/);
    expect(turns[1].reply.text).toMatch(/Paisley Street/i);
    expect(turns[2].reply.text).toMatch(/two days ago/i);
    expect(turns[3].reply.text).toMatch(/vomit/i);
    expect((turns[3].reply.text.match(/unsteady/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("keeps a changed Eliquis dose under review and supports a natural hold explanation", () => {
    const turns = conversation("case-12", [
      "yes what is your name and DOB",
      "yes it is a higher doese",
      "do you have any allergies",
      "do you have any medical conditions",
      "i cant give this medicine to you today",
      "because it is the wrong dose",
      "yes i will check it",
      "can you repeat what i told you",
      "I will hold this 5 mg prescription and check the dose with your doctor before supplying it.",
      "Can you repeat the plan back to me in your own words?",
    ]);
    expect(turns[0].reply.text).toMatch(/Evelyn Scott.*2 December 1942/);
    expect(turns[1].reply.text).toMatch(/check.*5 milligram/i);
    expect(turns[1].matchedTopicIds).not.toContain("explain_hold");
    expect(turns[4].reply.text).toMatch(/milligrams|dose|doctor/i);
    expect(turns[5].reply.text).toMatch(/doctor|check/i);
    expect(turns[6].reply.text).not.toMatch(/understand|another way|more simply/i);
    expect(turns[7].reply.text).toMatch(/explain the plan first/i);
    expect(turns[7].matchedTopicIds).not.toContain("teach_back");
    expect(turns[8].matchedTopicIds).toContain("explain_hold");
    expect(turns[9].matchedTopicIds).toContain("teach_back");
    expect(turns[9].reply.text).toMatch(/hold|check/i);
  });
});
