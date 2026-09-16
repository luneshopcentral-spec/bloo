import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSULTATION_QUIZ_CASES } from "@/lib/quiz/cases";
import { QUIZ_CONTENT_VERSION } from "@/lib/quiz/version";
import { scoreConsultationQuiz } from "@/lib/quiz/score";
import { isSameOrigin } from "@/lib/security/request";
import { allowRequest } from "@/lib/security/rate-limit";
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const input = z.object({ id: z.string().uuid(), caseId: z.string().max(50), version: z.literal(QUIZ_CONTENT_VERSION), mode: z.enum(["practice","challenge"]), answers: z.record(z.string().max(100)).refine((v) => Object.keys(v).length <= 30) }).safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid or outdated quiz" }, { status: 400 });
  if (!await allowRequest(user.id, "quiz", 60)) return NextResponse.json({ error: "Please retry later." }, { status: 429 });
  const quiz = CONSULTATION_QUIZ_CASES.find((c) => c.id === input.data.caseId);
  if (!quiz) return NextResponse.json({ error: "Unknown quiz" }, { status: 400 });
  const result = scoreConsultationQuiz(quiz, input.data.answers);
  const admin = createAdminClient();
  const { data: previous } = await admin.from("quiz_attempts").select("id").eq("id", input.data.id).eq("user_id", user.id).maybeSingle();
  if (previous) return NextResponse.json({ saved: true });
  const { error } = await admin.from("quiz_attempts").insert({ id: input.data.id, user_id: user.id, case_id: quiz.id, version: QUIZ_CONTENT_VERSION, mode: input.data.mode, answers: input.data.answers, percentage: result.percentage });
  return error ? NextResponse.json({ error: "Quiz progress could not be saved" }, { status: 503 }) : NextResponse.json({ saved: true });
}
