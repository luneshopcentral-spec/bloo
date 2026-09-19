import { checkoutAvailability } from "@/lib/governance/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { withBillingLock } from "@/lib/billing/lock";
import { isSameOrigin } from "@/lib/security/request";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripePriceId, siteUrl } from "@/lib/stripe/server";
import { isPlanId, planOption } from "@/lib/billing/plan";
import { stripePriceMatchesPlan } from "@/lib/billing/stripe-price";
import { pendingCheckoutUrl } from "@/lib/billing/pending-checkout";
import { checkoutErrorReason } from "@/lib/billing/checkout-error";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Starts a Stripe subscription Checkout Session for the signed-in user and
 * redirects the browser to Stripe. Triggered by a plain form POST (with a
 * hidden "plan" field of "monthly" or "yearly"), so it works without
 * client-side JavaScript. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const baseUrl = siteUrl(req.url);
  if (!checkoutAvailability().available) return NextResponse.redirect(`${baseUrl}/dashboard?checkout=unavailable`, { status: 303 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${baseUrl}/sign-in`, { status: 303 });
  }

  const { data: schemaReady, error: schemaError } = await createAdminClient().rpc("launch_schema_ready", {});
  if (schemaError || !schemaReady) return NextResponse.redirect(`${baseUrl}/dashboard?checkout=unavailable`, { status: 303 });

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

  try {
    return await withBillingLock("stripe-entitlements", async () => {
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
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } }, { idempotencyKey: "customer-" + user.id });
      customerId = customer.id;
      const { error } = await createAdminClient().from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
      if (error) throw new Error("Could not save billing customer");
    }
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    if (subscriptions.data.some((s) => !["canceled", "incomplete_expired"].includes(s.status))) {
      return NextResponse.redirect(baseUrl + "/account?billing=existing", { status: 303 });
    }
    const existingUrl = await pendingCheckoutUrl(stripe, customerId, user.id, plan, priceId);
    if (existingUrl) return NextResponse.redirect(existingUrl, { status: 303 });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the stored customer if we have one, otherwise let Stripe create it
      // from the user's email.
      customer: customerId,
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
    });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard?checkout=${checkoutErrorReason(error)}`, { status: 303 });
  }
}
