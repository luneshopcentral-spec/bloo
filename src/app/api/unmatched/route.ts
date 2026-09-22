import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/request";
import { allowRequest } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

// A batch of student utterances the deterministic matcher did not recognise,
// sent once when a consultation is submitted. Best-effort telemetry for growing
// the topic patterns — never blocks the student's attempt.
const schema = z.object({
  items: z
    .array(
      z.object({
        caseId: z.string().trim().max(40),
        stage: z.string().trim().max(40).optional(),
        turnIndex: z.number().int().min(0).max(200).optional(),
        text: z.string().trim().min(1).max(2000),
        reply: z.string().trim().max(2000).optional(),
      })
    )
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await allowRequest(user.id, "unmatched", 40))) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const rows = parsed.data.items.map((item) => ({
    user_id: user.id,
    case_id: item.caseId,
    stage: item.stage ?? null,
    turn_index: item.turnIndex ?? null,
    text: item.text,
    patient_reply: item.reply ?? null,
  }));

  const { error } = await createAdminClient().from("unmatched_utterances").insert(rows);
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 503 });
  return NextResponse.json({ saved: rows.length });
}
