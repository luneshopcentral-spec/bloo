import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionSnapshot } from "@/lib/billing/subscription";

export const runtime = "nodejs";

type AdminClient = ReturnType<typeof createAdminClient>;

function eventObjectId(event: Stripe.Event): string | null {
  const object = event.data.object as { id?: string };
  return object.id ?? null;
}

async function beginEvent(admin: AdminClient, event: Stripe.Event) {
  const { data: existing, error: readError } = await admin
    .from("stripe_webhook_events")
    .select("status, attempts")
    .eq("id", event.id)
    .maybeSingle();
  if (readError) throw new Error(`Unable to read webhook log: ${readError.message}`);
  if (existing?.status === "processed") return false;

  const { error: logError } = await admin
    .from("stripe_webhook_events")
    .upsert({
      id: event.id,
      event_type: event.type,
      object_id: eventObjectId(event),
      status: "processing",
      attempts: (existing?.attempts ?? 0) + 1,
      error_message: null,
      last_attempt_at: new Date().toISOString(),
      processed_at: null,
    }, { onConflict: "id" });
  if (logError) throw new Error(`Unable to begin webhook log: ${logError.message}`);
  return true;
}

async function finishEvent(
  admin: AdminClient,
  event: Stripe.Event,
  status: "processed" | "failed",
  errorMessage: string | null = null
) {
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      status,
      error_message: errorMessage?.slice(0, 2_000) ?? null,
      processed_at: status === "processed" ? new Date().toISOString() : null,
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", event.id);
  if (error) throw new Error(`Unable to finish webhook log: ${error.message}`);
}

async function userIdForCustomer(admin: AdminClient, customerId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(`Customer profile lookup failed: ${error.message}`);
  return data?.id ?? null;
}

async function applySubscription(
  admin: AdminClient,
  subscription: Stripe.Subscription,
  userIdHint?: string | null
) {
  const snapshot = subscriptionSnapshot(subscription);
  const userId = userIdHint
    ?? subscription.metadata?.supabase_user_id
    ?? await userIdForCustomer(admin, snapshot.customerId);
  if (!userId) {
    throw new Error(`No profile found for Stripe customer ${snapshot.customerId}`);
  }

  const { data, error } = await admin
    .from("profiles")
    .update({
      has_paid: snapshot.hasPaid,
      stripe_customer_id: snapshot.customerId,
      stripe_subscription_id: snapshot.subscriptionId,
      subscription_plan: snapshot.plan,
      subscription_status: snapshot.status,
      subscription_current_period_start: snapshot.currentPeriodStart,
      subscription_current_period_end: snapshot.currentPeriodEnd,
      subscription_cancel_at_period_end: snapshot.cancelAtPeriodEnd,
      subscription_updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Entitlement update failed for ${userId}: ${error?.message ?? "profile missing"}`);
  }
}

async function subscriptionFromInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice
): Promise<Stripe.Subscription | null> {
  const subscriptionDetails = (invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  }).subscription;
  if (!subscriptionDetails) return null;
  if (typeof subscriptionDetails !== "string") return subscriptionDetails;
  return stripe.subscriptions.retrieve(subscriptionDetails);
}

async function handleEvent(
  admin: AdminClient,
  stripe: Stripe,
  event: Stripe.Event
) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
      if (!subscriptionId) throw new Error("Completed checkout has no subscription");
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscription(
        admin,
        subscription,
        session.client_reference_id ?? session.metadata?.supabase_user_id
      );
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await applySubscription(admin, event.data.object as Stripe.Subscription);
      return;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscription = await subscriptionFromInvoice(
        stripe,
        event.data.object as Stripe.Invoice
      );
      if (subscription) await applySubscription(admin, subscription);
      return;
    }
    default:
      return;
  }
}

/**
 * Signature-verified and retry-safe Stripe webhook. Entitlement changes are
 * absolute/idempotent, database errors produce a 500 so Stripe retries, and a
 * processed event ID is never applied twice.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    const shouldProcess = await beginEvent(admin, event);
    if (!shouldProcess) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    await handleEvent(admin, stripe, event);
    await finishEvent(admin, event, "processed");
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    console.error(`Error handling Stripe event ${event.id} (${event.type}):`, error);
    try {
      await finishEvent(admin, event, "failed", message);
    } catch (logError) {
      console.error(`Unable to record Stripe event failure ${event.id}:`, logError);
    }
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
