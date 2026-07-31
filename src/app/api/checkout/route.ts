import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripePriceId, siteUrl } from "@/lib/stripe/server";
import { isPlanId, planOption } from "@/lib/billing/plan";
import { stripePriceMatchesPlan } from "@/lib/billing/stripe-price";
import { getPaidReleaseReadiness } from "@/lib/governance/editorial";
import { SITE_CONFIG } from "@/lib/site-config";

export const runtime = "nodejs";

/** Starts a Stripe subscription Checkout Session for the signed-in user and
 * redirects the browser to Stripe. Triggered by a plain form POST (with a
 * hidden "plan" field of "monthly" or "yearly"), so it works without
 * client-side JavaScript. */
export async function POST(req: Request) {
  const baseUrl = siteUrl(req.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${baseUrl}/sign-in`, { status: 303 });
  }

  const form = await req.formData();
  const planField = form.get("plan");
  if (!isPlanId(planField)) {
    return NextResponse.redirect(`${baseUrl}/dashboard?checkout=error`, { status: 303 });
  }
  const plan = planField;

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id, has_paid")
    .eq("id", user.id)
    .single();

  if (profileError || !profileRow) {
    console.error("Stripe checkout profile lookup failed:", profileError);
    return NextResponse.redirect(`${baseUrl}/dashboard?checkout=profile`, { status: 303 });
  }
  const profile = profileRow as { stripe_customer_id: string | null; has_paid: boolean } | null;

  // Already subscribed — nothing to buy.
  if (profile?.has_paid) {
    return NextResponse.redirect(`${baseUrl}/dashboard?checkout=already`, { status: 303 });
  }

  // The repository's editorial register deliberately blocks production paid
  // access until every case has pharmacist and jurisdiction approval. Test and
  // development environments remain available for controlled Stripe testing.
  if (process.env.NODE_ENV === "production") {
    const releaseReadiness = getPaidReleaseReadiness();
    const hasProductionUrl = Boolean(process.env.NEXT_PUBLIC_SITE_URL?.trim());
    const hasOperatorApproval = process.env.PAID_LAUNCH_APPROVED?.trim().toLowerCase() === "true";
    if (!releaseReadiness.ready || !SITE_CONFIG.supportEmail || !hasProductionUrl || !hasOperatorApproval) {
      console.error("Paid checkout blocked by launch readiness", {
        hasSupportEmail: Boolean(SITE_CONFIG.supportEmail),
        hasProductionUrl,
        hasOperatorApproval,
        editorialBlockerCount: releaseReadiness.blockers.length,
      });
      return NextResponse.redirect(`${baseUrl}/dashboard?checkout=unavailable`, { status: 303 });
    }
  }

  try {
    const stripe = getStripe();
    const priceId = stripePriceId(plan);
    const livePrice = await stripe.prices.retrieve(priceId);
    if (!stripePriceMatchesPlan(livePrice, planOption(plan))) {
      console.error("Stripe price does not match the published plan", {
        plan,
        priceId,
        active: livePrice.active,
        currency: livePrice.currency,
        unitAmount: livePrice.unit_amount,
        interval: livePrice.recurring?.interval,
      });
      return NextResponse.redirect(`${baseUrl}/dashboard?checkout=price`, { status: 303 });
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the stored customer if we have one, otherwise let Stripe create it
      // from the user's email.
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
      allow_promotion_codes: true,
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        submit: {
          message: `Refund/cancellation policy: ${baseUrl}/refund-policy · Privacy: ${baseUrl}/privacy`,
        },
        after_submit: {
          message: `Account or billing help: ${baseUrl}/support`,
        },
      },
      success_url: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.redirect(`${baseUrl}/dashboard?checkout=error`, { status: 303 });
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard?checkout=error`, { status: 303 });
  }
}
