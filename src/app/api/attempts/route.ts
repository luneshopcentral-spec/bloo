import { allowRequest } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submissionSchema, gradeSubmission, competencyMap } from "@/lib/attempts/grade";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { canPlayCase } from "@/lib/entitlement/entitlement";
import { getCaseEditorialRecord } from "@/lib/governance/editorial";
import { isSameOrigin } from "@/lib/security/request";
import type { Json } from "@/lib/types/database";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "Submission too large" }, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!await allowRequest(user.id, "attempt", 120)) return NextResponse.json({ error: "Please retry later." }, { status: 429 });
  const parsed = submissionSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const admin = createAdminClient();
  const { data: session, error } = await admin.from("practice_sessions").select("*").eq("id", parsed.data.sessionId).eq("user_id", user.id).single();
  if (error || !session) return NextResponse.json({ error: "Start a new practice session" }, { status: 409 });
  const c = STATIC_CASES.find((item) => item.id === session.case_id);
  const { data: profile } = await admin.from("profiles").select("has_paid, role").eq("id", user.id).single();
  if (!c || !canPlayCase(c, profile)) return NextResponse.json({ error: "Case unavailable" }, { status: 403 });
  if (getCaseEditorialRecord(c.id).version !== session.case_version) return NextResponse.json({ error: "Case updated. Start a new session." }, { status: 409 });
  const { data: previous } = await admin.from("attempts").select("details").eq("id", session.id).eq("user_id", user.id).maybeSingle();
  if (previous) return NextResponse.json({ saved: true, result: previous.details });
  const result = gradeSubmission(parsed.data, session);
  const { error: saveError } = await admin.from("attempts").insert({
    server_verified: true, id: session.id, user_id: user.id, case_id: c.id, case_version: session.case_version, mode: session.mode,
    score: result.dispense.pointsEarned + result.counselling.pointsEarned,
    max_score: result.dispense.pointsTotal + result.counselling.pointsTotal,
    passed: result.passed, assisted: result.assisted, counts_toward_progress: result.countsTowardProgress,
    critical_failures: [...result.dispense.criticalFailures.map((v) => `dispensing:${v}`), ...result.counselling.criticalFailures.map((v) => `counselling:${v}`)],
    competencies: competencyMap(result), details: JSON.parse(JSON.stringify(result)) as Json,
  });
  if (saveError?.code === "23505") {
    const { data: saved } = await admin.from("attempts").select("details").eq("id", session.id).single();
    if (saved) return NextResponse.json({ saved: true, result: saved.details });
  }
  return saveError ? NextResponse.json({ error: "Progress could not be saved. Please retry." }, { status: 503 }) : NextResponse.json({ saved: true, result });
}
