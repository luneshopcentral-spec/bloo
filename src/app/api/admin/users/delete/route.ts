import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminMutation, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Permanently delete an account. Irreversible: the auth user is removed and every
// FK to auth.users cascades (profile, attempts, quiz attempts, sessions,
// feedback, redemptions) or nulls (audit log, captured wording). Guardrails: an
// admin cannot delete their own account, and the caller must confirm the exact
// email, which must still match the account at delete time.
const schema = z.object({
  userId: z.string().uuid(),
  confirmEmail: z.string().trim().toLowerCase().email().max(254),
});

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
  const { userId, confirmEmail } = parsed.data;

  if (userId === actor.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Lookup failed. Check database readiness." }, { status: 503 });
  if (!profile) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });
  if (profile.email.toLowerCase() !== confirmEmail) {
    return NextResponse.json({ error: "The confirmation email does not match this account." }, { status: 400 });
  }

  // Record the intent with the email before the row is gone, so the audit trail
  // survives the cascade (actor_id/target reference is retained; the deleted
  // user's identity is captured in the detail payload).
  await logAdminAction(actor, "user.delete", { type: "profile", id: userId, detail: { email: profile.email } });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: "Delete failed. The account was not removed." }, { status: 503 });

  return NextResponse.json({ ok: true, email: profile.email });
}
