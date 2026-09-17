import { allowRequest } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { canPlayCase } from "@/lib/entitlement/entitlement";
import { getCaseEditorialRecord } from "@/lib/governance/editorial";
import { isSameOrigin } from "@/lib/security/request";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!await allowRequest(user.id, "session", 60)) return NextResponse.json({ error: "Please retry later." }, { status: 429 });
  const parsed = z.object({ caseId: z.string().max(30), seed: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), mode: z.enum(["learn", "practice", "exam"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  const c = STATIC_CASES.find((item) => item.id === parsed.data.caseId);
  const admin = createAdminClient();
  const { data: profile, error } = await admin.from("profiles").select("has_paid, role, comp_access_until").eq("id", user.id).single();
  if (error) return NextResponse.json({ error: "Practice service needs a database update" }, { status: 503 });
  if (!c || !canPlayCase(c, profile)) return NextResponse.json({ error: "Case unavailable" }, { status: 403 });
  const { data, error: insertError } = await admin.from("practice_sessions").insert({ user_id: user.id, case_id: c.id, case_version: getCaseEditorialRecord(c.id).version, seed: parsed.data.seed, mode: parsed.data.mode, assisted: parsed.data.mode === "learn" }).select("id").single();
  return insertError ? NextResponse.json({ error: "Practice service unavailable" }, { status: 503 }) : NextResponse.json(data);
}

export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const input = z.object({ sessionId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  const { data, error } = await createAdminClient().from("practice_sessions").update({ assisted: true }).eq("id", input.data.sessionId).eq("user_id", user.id).neq("mode", "exam").select("id").single();
  return error || !data ? NextResponse.json({ error: "Answers unavailable for this session" }, { status: 409 }) : NextResponse.json({ ok: true });
}
