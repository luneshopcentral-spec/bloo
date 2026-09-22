import { NextResponse } from "next/server";
import { z } from "zod";
import type { Json } from "@/lib/types/database";
import { requireAdminMutation, logAdminAction, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  // 15 min .. 1 year, matching the access RPC's bounds.
  minutes: z.number().int().min(15).max(525600),
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
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter a valid email." }, { status: 400 });
  }
  const admin = createAdminClient();

  // Resolve the email to an account. Input is lowercased and Supabase stores
  // auth emails lowercased, so exact match is correct and avoids treating "_"/"%"
  // in an address as SQL LIKE wildcards.
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", parsed.data.email)
    .limit(1)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Lookup failed. Check database readiness." }, { status: 503 });
  if (!profile) return NextResponse.json({ error: "No account is registered with that email." }, { status: 404 });

  // Reuse the audited access RPC — grants never shorten an existing window.
  const { error } = await admin.rpc("admin_manage_access", {
    actor_id: actor.id,
    operation: { action: "grant_comp", userId: profile.id, minutes: parsed.data.minutes } as Json,
  });
  if (error) {
    const message = error.message === "target not found"
      ? "That account could not be updated."
      : "The change could not be saved. Check database readiness and try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  await logAdminAction(actor, "user.grant_comp_by_email", {
    type: "profile",
    id: profile.id,
    detail: { email: profile.email, minutes: parsed.data.minutes },
  });
  return NextResponse.json({ ok: true, id: profile.id, email: profile.email, name: profile.full_name });
}
