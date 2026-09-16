import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_role"), userId: z.string().uuid(), role: z.enum(["admin", "student"]) }),
  z.object({ action: z.literal("grant_comp"), userId: z.string().uuid(), days: z.number().int().min(1).max(365) }),
  z.object({ action: z.literal("revoke_comp"), userId: z.string().uuid() }),
  z.object({ action: z.literal("reset_progress"), userId: z.string().uuid() }),
]);

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireAdmin("api");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const admin = createAdminClient();

  // An admin must not strip their own admin role and lock themselves out.
  if (body.action === "set_role" && body.role === "student" && body.userId === actor.id) {
    return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
  }

  if (body.action === "set_role") {
    const { error } = await admin.from("profiles").update({ role: body.role }).eq("id", body.userId);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    await logAdminAction(actor, "user.set_role", { type: "profile", id: body.userId, detail: { role: body.role } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "grant_comp") {
    const until = new Date(Date.now() + body.days * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await admin.from("profiles").update({ comp_access_until: until }).eq("id", body.userId);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    await logAdminAction(actor, "user.grant_comp", { type: "profile", id: body.userId, detail: { days: body.days, until } });
    return NextResponse.json({ ok: true, until });
  }

  if (body.action === "revoke_comp") {
    const { error } = await admin.from("profiles").update({ comp_access_until: null }).eq("id", body.userId);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    await logAdminAction(actor, "user.revoke_comp", { type: "profile", id: body.userId });
    return NextResponse.json({ ok: true });
  }

  // reset_progress: clear all recorded practice/quiz history for a user.
  const tables = ["attempts", "quiz_attempts", "practice_sessions"] as const;
  for (const table of tables) {
    const { error } = await admin.from(table).delete().eq("user_id", body.userId);
    if (error) return NextResponse.json({ error: `Failed clearing ${table}` }, { status: 500 });
  }
  await admin.from("profiles").update({ trial_cases_used: 0 }).eq("id", body.userId);
  await logAdminAction(actor, "user.reset_progress", { type: "profile", id: body.userId });
  return NextResponse.json({ ok: true });
}
