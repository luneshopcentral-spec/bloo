import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** Opens the Stripe billing portal so a subscribed user can update or cancel
 * their subscription. Requires the Customer Portal to be enabled in the Stripe
 * dashboard (Settings → Billing → Customer portal). Plain form POST. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${siteUrl()}/sign-in`, { status: 303 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  const customerId = (profileRow as { stripe_customer_id: string | null } | null)?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.redirect(`${siteUrl()}/dashboard`, { status: 303 });
  }

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/dashboard`,
    });
    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (error) {
    console.error("Stripe billing portal failed:", error);
    return NextResponse.redirect(`${siteUrl()}/dashboard?billing=error`, { status: 303 });
  }
}
