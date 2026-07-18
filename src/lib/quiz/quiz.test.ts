import { describe, expect, it } from "vitest";
import { MEDICINE_LEARNING_PROFILES } from "@/lib/medicines-learning/reference";
import { CONSULTATION_QUIZ_CASES } from "./cases";
import { scoreConsultationQuiz } from "./score";

describe("consultation quiz library", () => {
  it("contains a substantial set of hard, multi-domain cases", () => {
    expect(CONSULTATION_QUIZ_CASES).toHaveLength(10);
    expect(CONSULTATION_QUIZ_CASES.every((quizCase) => quizCase.questions.length >= 4)).toBe(true);
    expect(CONSULTATION_QUIZ_CASES.some((quizCase) => quizCase.prescriptions.some((script) => script.items.length > 1))).toBe(true);

    const domains = new Set(CONSULTATION_QUIZ_CASES.flatMap((quizCase) => quizCase.questions.map((question) => question.domain)));
    expect(domains).toEqual(new Set([
      "dose_calculation",
      "dose_selection",
      "interaction",
      "warning_labels",
      "consultation",
      "red_flags",
      "clinical_action",
      "legal_and_prescription",
    ]));
  });

  it("only references medicine profiles that exist in the learning book", () => {
    const profileIds = new Set(MEDICINE_LEARNING_PROFILES.map((profile) => profile.id));
    for (const quizCase of CONSULTATION_QUIZ_CASES) {
      expect(new Set(quizCase.medicineProfileIds).size).toBe(quizCase.medicineProfileIds.length);
      for (const profileId of quizCase.medicineProfileIds) expect(profileIds.has(profileId)).toBe(true);
      for (const script of quizCase.prescriptions) {
        for (const item of script.items) expect(profileIds.has(item.medicineProfileId)).toBe(true);
      }
    }
  });

  it("has valid, non-ambiguous multiple-choice definitions", () => {
    const questionIds = new Set<string>();
    for (const quizCase of CONSULTATION_QUIZ_CASES) {
      for (const question of quizCase.questions) {
        expect(questionIds.has(question.id)).toBe(false);
        questionIds.add(question.id);
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((option) => option.id)).size).toBe(4);
        expect(new Set(question.options.map((option) => option.text)).size).toBe(4);
        expect(question.options.some((option) => option.id === question.correctOptionId)).toBe(true);
        expect(question.explanation.length).toBeGreaterThan(30);
        expect(question.referenceNote.length).toBeGreaterThan(20);
      }
    }
  });

  it("requires both 75 percent and every critical answer to pass", () => {
    const quizCase = CONSULTATION_QUIZ_CASES[0];
    const allCorrect = Object.fromEntries(quizCase.questions.map((question) => [question.id, question.correctOptionId]));
    expect(scoreConsultationQuiz(quizCase, allCorrect)).toMatchObject({
      correct: 4,
      percentage: 100,
      criticalPassed: true,
      passed: true,
    });

    const criticalQuestion = quizCase.questions.find((question) => question.critical);
    expect(criticalQuestion).toBeDefined();
    const wrongCritical = criticalQuestion?.options.find((option) => option.id !== criticalQuestion.correctOptionId);
    const result = scoreConsultationQuiz(quizCase, {
      ...allCorrect,
      [criticalQuestion!.id]: wrongCritical!.id,
    });
    expect(result.percentage).toBe(75);
    expect(result.criticalPassed).toBe(false);
    expect(result.passed).toBe(false);

    const nonCriticalQuestion = quizCase.questions.find((question) => !question.critical)!;
    const wrongNonCritical = nonCriticalQuestion.options.find((option) => option.id !== nonCriticalQuestion.correctOptionId)!;
    const nonCriticalResult = scoreConsultationQuiz(quizCase, {
      ...allCorrect,
      [nonCriticalQuestion.id]: wrongNonCritical.id,
    });
    expect(nonCriticalResult.percentage).toBe(75);
    expect(nonCriticalResult.criticalPassed).toBe(true);
    expect(nonCriticalResult.passed).toBe(true);
  });
});
