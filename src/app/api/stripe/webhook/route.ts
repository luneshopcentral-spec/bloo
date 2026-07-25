import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Stripe webhook. The ONLY place `has_paid` is granted or revoked. Verifies the
 * signature, then maps the Stripe event back to a Supabase user and updates the
 * profile with the service-role key (bypassing RLS + the entitlement guard).
 *
 * Configure the endpoint in Stripe (Dashboard → Developers → Webhooks) to send
 * at least: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted. Put the signing secret in STRIPE_WEBHOOK_SECRET.
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

  async function setEntitlement(userId: string, hasPaid: boolean, customerId?: string | null) {
    const update: Record<string, unknown> = { has_paid: hasPaid };
    if (customerId) update.stripe_customer_id = customerId;
    await admin.from("profiles").update(update as never).eq("id", userId);
  }

  async function userIdForCustomer(customerId: string): Promise<string | null> {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    return (data as { id: string } | null)?.id ?? null;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
        if (userId) await setEntitlement(userId, true, customerId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
        const userId = subscription.metadata?.supabase_user_id ?? (await userIdForCustomer(customerId));
        if (userId) {
          const active = event.type !== "customer.subscription.deleted"
            && (subscription.status === "active" || subscription.status === "trialing");
          await setEntitlement(userId, active, customerId);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Error handling Stripe event ${event.type}:`, error);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
