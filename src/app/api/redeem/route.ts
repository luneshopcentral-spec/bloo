import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/request";
import { allowRequest } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Recipient comes exclusively from the verified session. The RPC is not
  // callable by a browser and commits the grant/counter/redemption together.
  try {
    const { data, error } = await createAdminClient().rpc("redeem_access_code_for_user", { input_code: input.data.code, recipient_id: user.id });
    if (error && REASONS[error.message]) {
      return NextResponse.json({ error: REASONS[error.message] }, { status: 400 });
    }
    if (error || typeof data !== "string" || !Number.isFinite(Date.parse(data))) {
      return NextResponse.json({ error: "Access codes are temporarily unavailable. Your code has been kept; please retry or contact support." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, grantedUntil: data });
  } catch {
    return NextResponse.json({ error: "Access codes are temporarily unavailable. Please retry or contact support." }, { status: 503 });
  }
}
