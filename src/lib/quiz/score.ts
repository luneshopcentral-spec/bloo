import type { ConsultationQuizCase, QuizResult } from "./types";

export function scoreConsultationQuiz(
  quizCase: ConsultationQuizCase,
  answers: Record<string, string | undefined>
): QuizResult {
  const scoredAnswers = quizCase.questions.map((question) => {
    const selectedOptionId = answers[question.id] ?? null;
    return {
      question,
      selectedOptionId,
      correct: selectedOptionId === question.correctOptionId,
    };
  });
  const correct = scoredAnswers.filter((answer) => answer.correct).length;
  const criticalPassed = scoredAnswers.every(
    (answer) => !answer.question.critical || answer.correct
  );
  const percentage = quizCase.questions.length
    ? Math.round((correct / quizCase.questions.length) * 100)
    : 0;

  return {
    correct,
    total: quizCase.questions.length,
    percentage,
    criticalPassed,
    passed: percentage >= 75 && criticalPassed,
    answers: scoredAnswers,
  };
}
