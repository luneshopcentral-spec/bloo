import type Stripe from "stripe";
import { isPlanId, type PlanId } from "@/lib/billing/plan";

export const ACCESS_GRANTING_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
]);

export function subscriptionGrantsAccess(
  status: Stripe.Subscription.Status
): boolean {
  return ACCESS_GRANTING_STATUSES.has(status);
}

export interface SubscriptionSnapshot {
  subscriptionId: string;
  customerId: string;
  plan: PlanId | null;
  status: Stripe.Subscription.Status;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasPaid: boolean;
}

export function subscriptionSnapshot(
  subscription: Stripe.Subscription
): SubscriptionSnapshot {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
  const plan = isPlanId(subscription.metadata?.plan)
    ? subscription.metadata.plan
    : null;
  const subscriptionPeriodEnd = (subscription as Stripe.Subscription & {
    current_period_end?: number;
  }).current_period_end;
  const subscriptionPeriodStart = (subscription as Stripe.Subscription & {
    current_period_start?: number;
  }).current_period_start;
  const itemPeriodStart = (subscription.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_start?: number })
    | undefined)?.current_period_start;
  const itemPeriodEnd = (subscription.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined)?.current_period_end;
  const periodEnd = subscriptionPeriodEnd ?? itemPeriodEnd;
  const periodStart = subscriptionPeriodStart ?? itemPeriodStart;

  return {
    subscriptionId: subscription.id,
    customerId,
    plan,
    status: subscription.status,
    currentPeriodStart: periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
    currentPeriodEnd: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    hasPaid: subscriptionGrantsAccess(subscription.status),
  };
}
