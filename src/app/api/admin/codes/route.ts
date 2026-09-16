import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const codePattern = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    code: z.string().trim().toUpperCase().regex(codePattern, "3–32 chars, A–Z 0–9 and dashes"),
    description: z.string().trim().max(200).optional(),
    grantsDays: z.number().int().min(1).max(365),
    maxRedemptions: z.number().int().min(1).max(100000).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
  z.object({ action: z.literal("set_active"), code: z.string(), active: z.boolean() }),
]);

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireAdmin("api");
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const admin = createAdminClient();

  if (parsed.data.action === "set_active") {
    const { error } = await admin.from("access_codes").update({ active: parsed.data.active }).eq("code", parsed.data.code);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    await logAdminAction(actor, "code.set_active", { type: "access_code", id: parsed.data.code, detail: { active: parsed.data.active } });
    return NextResponse.json({ ok: true });
  }

  const { code, description, grantsDays, maxRedemptions, expiresAt } = parsed.data;
  const { error } = await admin.from("access_codes").insert({
    code,
    description: description ?? null,
    grants_days: grantsDays,
    max_redemptions: maxRedemptions ?? null,
    expires_at: expiresAt ?? null,
    created_by: actor.id,
  });
  if (error) {
    const duplicate = error.code === "23505";
    return NextResponse.json({ error: duplicate ? "That code already exists" : "Create failed" }, { status: duplicate ? 409 : 500 });
  }
  await logAdminAction(actor, "code.create", { type: "access_code", id: code, detail: { grantsDays, maxRedemptions: maxRedemptions ?? null } });
  return NextResponse.json({ ok: true });
}
