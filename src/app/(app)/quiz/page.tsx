import type { Metadata } from "next";
import { QuizWorkspace } from "@/components/quiz/QuizWorkspace";

export const metadata: Metadata = {
  title: "Consultation Quizzes | DispenseRx Practice",
  description: "Advanced prescription-based pharmacy consultation quizzes with an integrated medicines learning book.",
};

export default function QuizPage() {
  return <QuizWorkspace />;
}
