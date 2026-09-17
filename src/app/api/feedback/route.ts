import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/request";
import { allowRequest } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!await allowRequest(user.id, "feedback", 10)) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  const input = z.object({ kind: z.enum(["content","bug","privacy","other"]), caseId: z.string().max(40).optional(), message: z.string().trim().min(10).max(4000) }).safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Write a message between 10 and 4,000 characters." }, { status: 400 });
  const { error } = await createAdminClient().from("feedback").insert({ user_id: user.id, kind: input.data.kind, case_id: input.data.caseId || null, message: input.data.message });
  return error ? NextResponse.json({ error: "Could not save your report. Please retry." }, { status: 503 }) : NextResponse.json({ saved: true });
}
