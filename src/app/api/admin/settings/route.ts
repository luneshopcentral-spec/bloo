import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMutation, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("maintenance_mode"), value: z.boolean() }),
  z.object({ key: z.literal("maintenance_message"), value: z.string().trim().min(1).max(500) }),
]);

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireAdminMutation(request);
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid setting" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("admin_settings")
    .upsert({ key: parsed.data.key, value: parsed.data.value, updated_by: actor.id, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Save failed" }, { status: 500 });

  await logAdminAction(actor, "settings.update", { type: "setting", id: parsed.data.key, detail: { value: parsed.data.value } });
  return NextResponse.json({ ok: true });
}
