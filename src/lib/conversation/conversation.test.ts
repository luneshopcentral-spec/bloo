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
import { buildPatientReply } from "./reply";
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

  it("offers varied patient replies for every scored topic in every case", () => {
    // teach_back and invite_questions build their replies dynamically in reply.ts.
    const dynamicTopics = new Set(["teach_back", "invite_questions"]);
    for (const practiceCase of STATIC_CASES) {
      const conversation = getConversationCase(practiceCase.id);
      for (const topic of conversation.topics) {
        if (dynamicTopics.has(topic.id)) continue;
        expect(
          topic.patientReplies.length,
          `${practiceCase.id} topic ${topic.id} needs at least two reply variants`
        ).toBeGreaterThanOrEqual(2);
      }
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

  it("keeps case 5 counselling facts consistent with Carol's stored clinical record", () => {
    const conversation = getConversationCase("case-5");
    const allergyTopic = conversation.topics.find((topic) => topic.id === "allergies");
    const conditionsReply = conversation.responseIntents
      .find((intent) => intent.id === "medical_conditions")
      ?.patientReplies.join(" ") ?? "";

    expect(allergyTopic?.patientReplies.join(" ").toLowerCase()).toContain("sulfonamide");
    expect(allergyTopic?.patientReplies.join(" ").toLowerCase()).toContain("anaphylactic");
    expect(conditionsReply.toLowerCase()).toContain("high blood pressure");
    expect(conditionsReply.toLowerCase()).toContain("kidney");
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

  it("understands the Liam case wording shown in the reported conversation", () => {
    const conversation = getConversationCase("case-3");
    const purposeAndDose = classifyWithRules(
      conversation,
      "Amoxicillin is an antibiotic used to treat infections. Liam should have 10mls three times a day for 10 days."
    );
    const ids = purposeAndDose.map((match) => match.topicId);
    expect(ids).toEqual(expect.arrayContaining(["purpose", "directions"]));

    const safety = classifyWithRules(
      conversation,
      "Seek immediate medical attention for breathing difficulties, facial or throat swelling, widespread hives or blistering skin."
    );
    expect(safety.map((match) => match.topicId)).toContain("reaction_safety");
  });

  it("treats side-effect advice as counselling rather than a symptom-history question", () => {
    const conversation = getConversationCase("case-3");
    const text = "It might cause an upset stomach and nausea.";
    expect(classifyWithRules(conversation, text).map((match) => match.topicId)).toContain("common_effects");
    expect(matchResponseIntent(conversation, text)?.id).toBe("side_effect_explanation");
    expect(matchResponseIntent(conversation, "Does Liam have any nausea?")?.id).toBe("current_symptoms");
  });

  it("answers diagnosis and courtesy questions naturally without awarding hidden marks", () => {
    const conversation = getConversationCase("case-3");
    expect(matchResponseIntent(conversation, "What infection is it?")?.id).toBe("diagnosis_question");
    expect(matchResponseIntent(conversation, "Thank you, goodbye")?.id).toBe("courtesy_close");
  });

  it("does not repeat the same patient question after questions were already invited", () => {
    const conversation = getConversationCase("case-3");
    const first = buildPatientReply(conversation, ["invite_questions"], new Set(), 8, true, null);
    const repeat = buildPatientReply(
      conversation,
      ["invite_questions"],
      new Set(["invite_questions"]),
      9,
      true,
      null
    );
    expect(first.text).toBe(conversation.patientQuestion);
    expect(repeat.text).toBe("No other questions, thank you.");
  });

  it("does not reopen a concern that was already answered when closing the handover", () => {
    const conversation = getConversationCase("case-6");
    const reply = buildPatientReply(
      conversation,
      ["invite_questions"],
      new Set([conversation.concernTopicId]),
      9,
      true,
      null
    );

    expect(reply.text).toBe("No further questions, thank you.");
  });

  it("recognises teach-back only when the patient is asked to explain the plan", () => {
    const conversation = getConversationCase("case-3");
    expect(classifyWithRules(conversation, "Do you understand?").map((match) => match.topicId))
      .not.toContain("teach_back");
    expect(classifyWithRules(
      conversation,
      "Just so I know I explained it clearly, can you tell me how you will give Liam each dose?"
    ).map((match) => match.topicId)).toContain("teach_back");
  });
});
describe("reported test-run conversation regressions", () => {
  it("recognises 'are you using any medications' as the other-medicines check", () => {
    const conversation = getConversationCase("case-7");
    const ids = classifyWithRules(conversation, "Are you using any medications").map(
      (match) => match.topicId
    );
    expect(ids).toContain("current_medicines");
  });

  it("treats a medicine explanation as information-giving, not a symptom question", () => {
    const conversation = getConversationCase("case-7");
    const text =
      "Oxycontin is an extended release tablet containing oxycodone for pain treatment.";
    expect(matchResponseIntent(conversation, text)?.id).toBe("medicine_explanation");
    expect(matchResponseIntent(conversation, text)?.id).not.toBe("current_symptoms");
    expect(matchResponseIntent(conversation, "Do you have any pain right now?")?.id)
      .toBe("current_symptoms");
  });

  it("credits overdose red-flag counselling without giving the alcohol answer away", () => {
    const conversation = getConversationCase("case-7");
    const ids = classifyWithRules(
      conversation,
      "If you get an allergic reaction, extreme drowsiness, and irregular breathing, seek urgent care"
    ).map((match) => match.topicId);
    expect(ids).toContain("respiratory_red_flags");
    expect(ids).not.toContain("sedation_safety");
  });

  it("recognises the opioid tolerance question, including the common misspelling", () => {
    const case7 = getConversationCase("case-7");
    const case8 = getConversationCase("case-8");
    expect(classifyWithRules(case7, "What is your opoid tolerance").map((m) => m.topicId))
      .toContain("opioid_tolerance");
    expect(classifyWithRules(case8, "What is your opoid tolerance").map((m) => m.topicId))
      .toContain("opioid_history");
  });

  it("credits urgent-referral wording for the lithium case without the literal phrase", () => {
    const conversation = getConversationCase("case-11");
    const doctorNow = classifyWithRules(
      conversation,
      "If your hands are shakier and you feel unsteady, you need to go to the doctor immediately."
    ).map((m) => m.topicId);
    const tremors = classifyWithRules(conversation, "If you have tremors seek urgent care.").map(
      (m) => m.topicId
    );
    const vomiting = classifyWithRules(
      conversation,
      "If you experience vomiting seek urgent care"
    ).map((m) => m.topicId);
    expect(doctorNow).toContain("urgent_plan");
    expect(tremors).toContain("urgent_plan");
    expect(vomiting).toContain("urgent_plan");
  });

  it("links lithium and dehydration in either word order", () => {
    const conversation = getConversationCase("case-11");
    const ids = classifyWithRules(
      conversation,
      "Lithium can dehydrate you so make sure to drink a lot of water."
    ).map((m) => m.topicId);
    expect(ids).toContain("interaction_explanation");
  });

  it("acknowledges dosing statements and yes/no answers instead of acting confused", () => {
    const conversation = getConversationCase("case-11");
    expect(matchResponseIntent(conversation, "Take one capsule two times a day.")?.id)
      .toBe("dosing_instruction");
    expect(matchResponseIntent(conversation, "no you cannot.")?.id).toBe("negative_answer");
    expect(
      matchResponseIntent(conversation, "no, you can not take it without doctor's advice")?.id
    ).toBe("negative_answer");
  });

  it("distinguishes history-taking questions from counselling statements", () => {
    const temazepam = getConversationCase("case-4");
    const asked = classifyWithRules(temazepam, "How much alcohol would you usually drink in a week?");
    const counselled = classifyWithRules(
      temazepam,
      "Temazepam and alcohol together can dangerously increase sedation."
    );
    expect(asked.map((m) => m.topicId)).toContain("sedative_alcohol_history");
    expect(counselled.map((m) => m.topicId)).not.toContain("sedative_alcohol_history");
    expect(counselled.map((m) => m.topicId)).toContain("explain_risk");

    const doxycycline = getConversationCase("case-6");
    const pregnancyAsked = classifyWithRules(doxycycline, "Is there any chance you are pregnant?");
    const pregnancyCounselled = classifyWithRules(
      doxycycline,
      "Doxycycline should not be used in pregnancy."
    );
    expect(pregnancyAsked.map((m) => m.topicId)).toContain("pregnancy_check");
    expect(pregnancyCounselled.map((m) => m.topicId)).not.toContain("pregnancy_check");
  });

  it("only repeats back instructions the student actually gave during teach-back", () => {
    const conversation = getConversationCase("case-7");
    const nothingCounselled = buildPatientReply(
      conversation,
      ["teach_back"],
      new Set(["confirm_identity", "confirm_age"]),
      5,
      true,
      null
    );
    expect(nothingCounselled.text.toLowerCase()).toContain("go through the instructions");
    expect(nothingCounselled.text).not.toContain("12 hours");

    const storageOnly = buildPatientReply(
      conversation,
      ["teach_back"],
      new Set(["secure_storage"]),
      6,
      true,
      null
    );
    expect(storageOnly.text.toLowerCase()).toContain("locked away");
    expect(storageOnly.text).not.toContain("12 hours");
    expect(storageOnly.text.toLowerCase()).not.toContain("alcohol");
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
