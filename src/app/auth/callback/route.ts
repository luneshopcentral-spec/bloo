import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to sign-in with an error indicator
  const providerError = searchParams.get("error_code") ?? searchParams.get("error");
  const errorCode = providerError === "otp_expired" || providerError === "access_denied"
    ? providerError
    : "auth_callback_failed";
  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(errorCode)}`);
}
