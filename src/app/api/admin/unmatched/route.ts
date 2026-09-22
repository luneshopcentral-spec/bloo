import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMutation, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({ id: z.string().uuid(), reviewed: z.boolean() });

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireAdminMutation(request);
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("unmatched_utterances")
    .update({ reviewed: parsed.data.reviewed })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await logAdminAction(actor, "unmatched.set_reviewed", {
    type: "unmatched_utterance",
    id: parsed.data.id,
    detail: { reviewed: parsed.data.reviewed },
  });
  return NextResponse.json({ ok: true });
}
