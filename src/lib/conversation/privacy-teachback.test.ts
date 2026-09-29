import { describe, expect, it } from "vitest";
import { CONVERSATION_CASES } from "./cases";
import { advanceConversation, createDialogueState, evaluateConversation, replayConversation } from "./engine";
import { chooseConsultationStarter, initialConversationMessages } from "./opening";
import type { ConversationMessage } from "./types";

const cases = Object.values(CONVERSATION_CASES);
const namedCases = cases.map(conversation => [conversation.caseId, conversation] as const);

describe("consultation opening", () => {
  it.each(namedCases)("allows either speaker to begin %s", (_caseId, conversation) => {
    expect(chooseConsultationStarter(0.1)).toBe("student");
    expect(chooseConsultationStarter(0.9)).toBe("patient");
    expect(initialConversationMessages(conversation, true)).toEqual([]);
    expect(initialConversationMessages(conversation, false)[0]).toMatchObject({ role: "patient", text: conversation.openingMessage });
    const first = advanceConversation(conversation, createDialogueState(false), "Hi, I'm Alex, the pharmacist looking after you today. How can I help?");
    expect(first.reply.text).toBe(conversation.openingMessage);
    expect(first.unrecognised).toBe(false);
    const specific = advanceConversation(conversation, createDialogueState(false), "Could I confirm your full name?");
    expect(specific.matchedTopicIds).toContain("confirm_identity");
    expect(specific.reply.text).not.toBe(conversation.openingMessage);
  });

  it("does not treat a bare 'yes' from a student-led opening as a supply promise", () => {
    const transcript: ConversationMessage[] = [{ id: "student-first", role: "student", text: "Yes." }];
    expect(replayConversation(CONVERSATION_CASES["case-1"], transcript).supplyPromised).toBe(false);
  });
});

describe("private-space offer", () => {
  it.each(namedCases)("scores the offer in %s, including a student-led opening", (_caseId, conversation) => {
    const offered = advanceConversation(conversation, createDialogueState(), "Would you like to discuss your medicine in our private consultation room?");
    expect(offered.matchedTopicIds).toContain("privacy_offer");
    expect(offered.reply.text).toMatch(/private|comfortable|counter/i);
    expect(offered.state.privacySetting).toBe("counter");
    const introduction = advanceConversation(conversation, createDialogueState(), "Hi, I'm Alex, the pharmacist.");
    const accepted = advanceConversation(conversation, introduction.state, "Would you like to discuss your medicine in our private consultation room?");
    expect(accepted.reply.text).toMatch(/let['’]s step into the consultation room/i);
    expect(accepted.state.privacySetting).toBe("private");
    const transcript: ConversationMessage[] = [{ id: "s1", role: "student", text: "Would you like to discuss your medicine in our private consultation room?" }];
    expect(evaluateConversation(conversation, transcript).checks.find(check => check.id === "privacy_offer")?.passed).toBe(true);
    expect(evaluateConversation(conversation, []).criticalFailures).toContain("privacy_offer");
  });

  it.each([
    "Your information is private and confidential.",
    "Is this area private?",
    "We cannot offer a private room.",
    "I'll keep this private.",
    "Do you want to keep this private?",
  ])("does not credit a statement that fails to offer a private space: %s", text => {
    for (const conversation of cases) {
      expect(advanceConversation(conversation, createDialogueState(), text).matchedTopicIds).not.toContain("privacy_offer");
    }
  });
});

describe("grounded teach-back", () => {
  it.each(namedCases)("has a meaningful recap for every counselled point in %s", (_caseId, conversation) => {
    for (const topic of conversation.topics.filter(topic => topic.category === "clinical_counselling" || topic.category === "safety_netting")) {
      expect(Boolean(topic.grounded || topic.teachBackReply), topic.id).toBe(true);
    }
  });

  it.each(namedCases)("recaps each explained point in %s without a generic acknowledgement", (_caseId, conversation) => {
    for (const topic of conversation.topics.filter(topic => topic.category === "clinical_counselling" || topic.category === "safety_netting")) {
      const explanation = advanceConversation(conversation, createDialogueState(), topic.examples[0]);
      expect(explanation.matchedTopicIds, `${conversation.caseId}/${topic.id}`).toContain(topic.id);
      const taught = advanceConversation(conversation, explanation.state, "Can you repeat everything I just said to you in your own words?");
      expect(taught.matchedTopicIds, `${conversation.caseId}/${topic.id}`).toContain("teach_back");
      expect(taught.reply.text, `${conversation.caseId}/${topic.id}`).not.toMatch(/^(?:okay|right|got it|thanks)[,.! ]*$/i);
      expect(taught.reply.text, `${conversation.caseId}/${topic.id}`).not.toMatch(/go through the instructions|explain the plan first/i);
    }
  });

  it("understands 'repeat everything I just said' and recaps only the case-3 points taught", () => {
    const conversation = CONVERSATION_CASES["case-3"];
    let state = createDialogueState();
    for (const line of ["Amoxicillin is an antibiotic for Liam's infection.", "Give Liam 10 mL three times a day for 10 days.", "Keep the bottle in the fridge."]) {
      state = advanceConversation(conversation, state, line).state;
    }
    const response = advanceConversation(conversation, state, "Can you repeat everything I just said to you in your own words?");
    expect(response.matchedTopicIds).toContain("teach_back");
    expect(response.reply.text).toMatch(/infection/i);
    expect(response.reply.text).toMatch(/10 ml|ten millilitres/i);
    expect(response.reply.text).toMatch(/fridge/i);
    expect(response.reply.text).not.toMatch(/syringe|rash|diarrhoea/i);
  });

  it("does not give away the held-supply plan when nothing has been explained", () => {
    const conversation = CONVERSATION_CASES["case-1"];
    const response = advanceConversation(conversation, createDialogueState(), "Tell me what you learnt about the plan from our conversation.");
    expect(response.matchedTopicIds).not.toContain("teach_back");
    expect(response.reply.text).toMatch(/explain the plan first/i);
    expect(response.reply.text).not.toMatch(/repeat is too early/i);
  });
});
