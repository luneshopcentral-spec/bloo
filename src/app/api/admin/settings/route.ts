import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETTING_KEYS } from "@/lib/admin/settings";

export const runtime = "nodejs";

const schema = z.object({
  key: z.enum(SETTING_KEYS as [string, ...string[]]),
  // Only primitive JSON values are accepted for settings.
  value: z.union([z.boolean(), z.string().max(500), z.number()]),
});

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireAdmin("api");
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
