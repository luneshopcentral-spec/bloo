import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMutation, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(2000),
    level: z.enum(["info", "success", "warning", "critical"]),
    endsAt: z.string().datetime().nullable().optional(),
  }),
  z.object({ action: z.literal("set_active"), id: z.string().uuid(), active: z.boolean() }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const admin = createAdminClient();
  const body = parsed.data;

  if (body.action === "create") {
    const { error } = await admin.from("announcements").insert({
      title: body.title,
      body: body.body,
      level: body.level,
      ends_at: body.endsAt ?? null,
      created_by: actor.id,
    });
    if (error) return NextResponse.json({ error: "Create failed" }, { status: 500 });
    await logAdminAction(actor, "announcement.create", { type: "announcement", detail: { title: body.title, level: body.level } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_active") {
    const { error } = await admin.from("announcements").update({ active: body.active }).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    await logAdminAction(actor, "announcement.set_active", { type: "announcement", id: body.id, detail: { active: body.active } });
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("announcements").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  await logAdminAction(actor, "announcement.delete", { type: "announcement", id: body.id });
  return NextResponse.json({ ok: true });
}
