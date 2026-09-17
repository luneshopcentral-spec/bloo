import { isSameOrigin } from "@/lib/security/request";
import { allowRequest } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** Opens the Stripe billing portal so a subscribed user can update or cancel
 * their subscription. Requires the Customer Portal to be enabled in the Stripe
 * dashboard (Settings → Billing → Customer portal). Plain form POST. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const baseUrl = siteUrl(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${baseUrl}/sign-in`, { status: 303 });
  }

  if (!await allowRequest(user.id, "billing", 20)) return NextResponse.json({ error: "Please retry later." }, { status: 429 });
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (profileError) console.error("Billing portal profile lookup failed:", profileError);
  const customerId = (profileRow as { stripe_customer_id: string | null } | null)?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.redirect(`${baseUrl}/dashboard?billing=error`, { status: 303 });
  }

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard`,
    });
    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (error) {
    console.error("Stripe billing portal failed:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard?billing=error`, { status: 303 });
  }
}
