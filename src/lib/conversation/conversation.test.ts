import { describe, expect, it } from "vitest";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { getConversationCase } from "./cases";
import {
  acceptSemanticCandidates,
  classifyWithRules,
  findUnsafeAdvice,
  matchResponseIntent,
  splitUtterance,
} from "./matcher";
import { combineAttemptResults, scoreCounselling } from "./score";
import type { DispenseResult } from "@/lib/scoring/types";

const safeDispense: DispenseResult = {
  checks: [],
  pointsEarned: 8,
  pointsTotal: 8,
  passed: true,
  passThreshold: 7,
  criticalFailures: [],
  assisted: false,
  countsTowardProgress: true,
  tip: "Test tip",
};

describe("conversation configuration", () => {
  it("provides a post-dispensing conversation for every practice case", () => {
    for (const practiceCase of STATIC_CASES) {
      const conversation = getConversationCase(practiceCase.id);
      expect(conversation.caseId).toBe(practiceCase.id);
      expect(conversation.topics.length).toBeGreaterThanOrEqual(10);
      expect(conversation.topics.some((topic) => topic.critical)).toBe(true);
    }
  });

  it("splits longer student utterances for multi-intent semantic matching", () => {
    expect(splitUtterance("Hello. Take one tablet twice daily; also use sunscreen.")).toEqual(
      expect.arrayContaining(["Hello", "Take one tablet twice daily", "use sunscreen"])
    );
  });

  it("marks patient name and age or date of birth as separate critical checks", () => {
    const conversation = getConversationCase("case-1");
    const nameOnly = classifyWithRules(conversation, "Could I confirm your full name?");
    const ageOnly = classifyWithRules(conversation, "How old are you?");
    const both = classifyWithRules(
      conversation,
      "Could I confirm your full name and date of birth?"
    );

    expect(nameOnly.map((match) => match.topicId)).toContain("confirm_identity");
    expect(nameOnly.map((match) => match.topicId)).not.toContain("confirm_age");
    expect(ageOnly.map((match) => match.topicId)).toContain("confirm_age");
    expect(both.map((match) => match.topicId)).toEqual(
      expect.arrayContaining(["confirm_identity", "confirm_age"])
    );
  });

  it("responds to common clinical questions even when they are not scoring topics", () => {
    const conversation = getConversationCase("case-1");
    expect(matchResponseIntent(conversation, "Have you taken this medication before?")?.id)
      .toBe("previous_use");
    expect(matchResponseIntent(conversation, "Any other medical conditions?")?.id)
      .toBe("medical_conditions");
    expect(matchResponseIntent(conversation, "Any chest pain?")?.id)
      .toBe("current_symptoms");
    expect(matchResponseIntent(conversation, "Could I ask you a couple of questions?")?.id)
      .toBe("permission_to_ask");
  });
});
describe("deterministic clinical gates", () => {
  it("recognises multiple valid counselling points in one message", () => {
    const conversation = getConversationCase("case-1");
    const matches = classifyWithRules(
      conversation,
      "Take one capsule three times a day and make sure you finish the full course."
    );
    const ids = matches.map((match) => match.topicId);
    expect(ids).toContain("directions");
    expect(ids).toContain("complete_course");
  });

  it("does not award directions for the wrong dose even with a high semantic score", () => {
    const conversation = getConversationCase("case-1");
    const matches = acceptSemanticCandidates(
      conversation,
      "Take two capsules twice daily.",
      [{ topicId: "directions", score: 0.99 }]
    );
    expect(matches).toEqual([]);
  });

  it("does not reward a leading allergy assumption as an allergy check", () => {
    const conversation = getConversationCase("case-2");
    const matches = acceptSemanticCandidates(
      conversation,
      "You don't have any allergies, correct?",
      [{ topicId: "allergies", score: 0.97 }]
    );
    expect(matches.some((match) => match.topicId === "allergies")).toBe(false);
  });

  it("requires both the hold and prescriber-contact explanation", () => {
    const conversation = getConversationCase("case-4");
    const incomplete = classifyWithRules(conversation, "I will call your doctor later.");
    const complete = classifyWithRules(
      conversation,
      "I need to hold this prescription and contact your prescriber before I can supply it."
    );
    expect(incomplete.some((match) => match.topicId === "explain_hold")).toBe(false);
    expect(complete.some((match) => match.topicId === "explain_hold")).toBe(true);
  });

  it("scores antacid separation and sun protection independently", () => {
    const conversation = getConversationCase("case-6");
    const separation = classifyWithRules(
      conversation,
      "Leave at least two hours between doxycycline and your antacid or multivitamin."
    );
    const sun = classifyWithRules(
      conversation,
      "Doxycycline can make you sensitive to sunlight, so use sunscreen and protective clothing."
    );
    expect(separation.some((match) => match.topicId === "separation")).toBe(true);
    expect(separation.some((match) => match.topicId === "sun_precautions")).toBe(false);
    expect(sun.some((match) => match.topicId === "sun_precautions")).toBe(true);
  });

  it("detects explicit unsafe advice without flagging a correct warning", () => {
    const conversation = getConversationCase("case-2");
    expect(findUnsafeAdvice(conversation, "You should take a double dose next time.")).toHaveLength(1);
    expect(findUnsafeAdvice(conversation, "Do not double your next dose.")).toHaveLength(0);
  });

  it("flags liquid storage instructions given for an erythromycin capsule supply", () => {
    const conversation = getConversationCase("case-1");
    const findings = findUnsafeAdvice(
      conversation,
      "Shake it well and keep the medicine refrigerated."
    );
    expect(findings.map((finding) => finding.id)).toContain("wrong_capsule_storage_advice");
    expect(matchResponseIntent(conversation, "Keep it in the fridge")?.id)
      .toBe("wrong_dosage_form_advice");
  });
});

describe("combined marking", () => {
  it("fails counselling when age or date of birth is not confirmed", () => {
    const conversation = getConversationCase("case-1");
    const addressed = conversation.topics
      .filter((topic) => topic.id !== "confirm_age")
      .map((topic) => topic.id);
    const result = scoreCounselling({
      conversation,
      addressedTopicIds: addressed,
      unsafeAdvice: [],
      transcript: [],
      matcherMode: "rules",
    });

    expect(result.criticalFailures).toContain("confirm_age");
    expect(result.passed).toBe(false);
  });

  it("fails counselling when a critical topic is missing despite a high score", () => {
    const conversation = getConversationCase("case-1");
    const addressed = conversation.topics
      .filter((topic) => topic.id !== "directions")
      .map((topic) => topic.id);
    const result = scoreCounselling({
      conversation,
      addressedTopicIds: addressed,
      unsafeAdvice: [],
      transcript: [],
      matcherMode: "semantic",
    });
    expect(result.pointsEarned).toBeGreaterThanOrEqual(result.passThreshold);
    expect(result.criticalFailures).toContain("directions");
    expect(result.passed).toBe(false);
  });

  it("treats detected unsafe advice as a critical failure", () => {
    const conversation = getConversationCase("case-2");
    const unsafeAdvice = findUnsafeAdvice(
      conversation,
      "Ibuprofen is safe with warfarin, so you can take it whenever you need."
    );
    const result = scoreCounselling({
      conversation,
      addressedTopicIds: conversation.topics.map((topic) => topic.id),
      unsafeAdvice,
      transcript: [],
      matcherMode: "semantic",
    });
    expect(result.criticalFailures).toContain("unsafe_advice");
    expect(result.passed).toBe(false);
  });

  it("requires both dispensing and counselling to pass the complete attempt", () => {
    const conversation = getConversationCase("case-1");
    const counselling = scoreCounselling({
      conversation,
      addressedTopicIds: conversation.topics.map((topic) => topic.id),
      unsafeAdvice: [],
      transcript: [],
      matcherMode: "semantic",
    });
    expect(combineAttemptResults(safeDispense, counselling).passed).toBe(true);
    expect(
      combineAttemptResults({ ...safeDispense, passed: false }, counselling).passed
    ).toBe(false);
  });

  it("keeps assisted dispensing attempts out of progress after counselling", () => {
    const conversation = getConversationCase("case-1");
    const counselling = scoreCounselling({
      conversation,
      addressedTopicIds: conversation.topics.map((topic) => topic.id),
      unsafeAdvice: [],
      transcript: [],
      matcherMode: "rules",
    });
    const result = combineAttemptResults(
      { ...safeDispense, assisted: true, countsTowardProgress: false },
      counselling
    );
    expect(result.assisted).toBe(true);
    expect(result.countsTowardProgress).toBe(false);
  });
});
