import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved"]),
});

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
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("feedback")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await logAdminAction(actor, "feedback.set_status", {
    type: "feedback",
    id: parsed.data.id,
    detail: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}
