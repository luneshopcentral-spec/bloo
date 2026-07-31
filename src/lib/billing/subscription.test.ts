import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  subscriptionGrantsAccess,
  subscriptionSnapshot,
} from "./subscription";

describe("Stripe subscription entitlement mapping", () => {
  it.each([
    ["active", true],
    ["trialing", true],
    ["past_due", false],
    ["unpaid", false],
    ["canceled", false],
    ["incomplete", false],
    ["incomplete_expired", false],
    ["paused", false],
  ] as Array<[Stripe.Subscription.Status, boolean]>) (
    "maps %s access to %s",
    (status, expected) => {
      expect(subscriptionGrantsAccess(status)).toBe(expected);
    }
  );

  it("records plan, status, customer, cancellation and billing period", () => {
    const subscription = {
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      metadata: { plan: "yearly", supabase_user_id: "user_123" },
      cancel_at_period_end: true,
      items: { data: [{ current_period_start: 1_797_321_600, current_period_end: 1_800_000_000 }] },
    } as unknown as Stripe.Subscription;

    expect(subscriptionSnapshot(subscription)).toEqual({
      subscriptionId: "sub_123",
      customerId: "cus_123",
      plan: "yearly",
      status: "active",
      currentPeriodStart: new Date(1_797_321_600_000).toISOString(),
      currentPeriodEnd: new Date(1_800_000_000_000).toISOString(),
      cancelAtPeriodEnd: true,
      hasPaid: true,
    });
  });
});
