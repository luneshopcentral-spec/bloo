import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { QuizWorkspace } from "@/components/quiz/QuizWorkspace";

export const metadata: Metadata = {
  title: "Consultation Quizzes",
  description: "Advanced prescription-based pharmacy consultation quizzes with an integrated medicines learning book.",
};

export default async function QuizPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/sign-in");
  return <QuizWorkspace userId={user.id} />;
}
