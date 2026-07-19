import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripePriceId, siteUrl } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** Starts a Stripe subscription Checkout Session for the signed-in user and
 * redirects the browser to Stripe. Triggered by a plain form POST, so it works
 * without client-side JavaScript. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${siteUrl()}/sign-in`, { status: 303 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("stripe_customer_id, has_paid")
    .eq("id", user.id)
    .single();
  const profile = profileRow as { stripe_customer_id: string | null; has_paid: boolean } | null;

  // Already subscribed — nothing to buy.
  if (profile?.has_paid) {
    return NextResponse.redirect(`${siteUrl()}/dashboard?checkout=already`, { status: 303 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: stripePriceId(), quantity: 1 }],
      // Reuse the stored customer if we have one, otherwise let Stripe create it
      // from the user's email.
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id },
      subscription_data: { metadata: { supabase_user_id: user.id } },
      allow_promotion_codes: true,
      success_url: `${siteUrl()}/dashboard?checkout=success`,
      cancel_url: `${siteUrl()}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.redirect(`${siteUrl()}/dashboard?checkout=error`, { status: 303 });
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.redirect(`${siteUrl()}/dashboard?checkout=error`, { status: 303 });
  }
}
