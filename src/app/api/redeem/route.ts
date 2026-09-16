import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/request";
import { allowRequest } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

// Maps the redeem RPC's raise-exception messages onto friendly copy.
const REASONS: Record<string, string> = {
  "invalid code": "That code was not recognised.",
  "code inactive": "That code is no longer active.",
  "code expired": "That code has expired.",
  "code fully redeemed": "That code has reached its redemption limit.",
  "already redeemed": "You have already redeemed that code.",
};

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await allowRequest(user.id, "redeem", 10))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const input = z
    .object({ code: z.string().trim().toUpperCase().min(3).max(32) })
    .safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid code." }, { status: 400 });

  // The RPC (security definer) validates and grants atomically as the caller.
  const { data, error } = await client.rpc("redeem_access_code", { input_code: input.data.code });
  if (error) {
    const reason = REASONS[error.message] ?? "That code could not be redeemed.";
    return NextResponse.json({ error: reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true, grantedUntil: data });
}
