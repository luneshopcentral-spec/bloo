import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { planOption } from "./plan";
import { stripePriceMatchesPlan } from "./stripe-price";

function price(overrides: Partial<Stripe.Price> = {}): Stripe.Price {
  return {
    active: true,
    currency: "aud",
    type: "recurring",
    unit_amount: 1300,
    recurring: {
      interval: "month",
      interval_count: 1,
      meter: null,
      trial_period_days: null,
      usage_type: "licensed",
    },
    ...overrides,
  } as Stripe.Price;
}

describe("published Stripe price guard", () => {
  it("accepts the configured monthly amount and interval", () => {
    expect(stripePriceMatchesPlan(price(), planOption("monthly"))).toBe(true);
  });

  it.each([
    ["inactive", { active: false }],
    ["wrong currency", { currency: "usd" }],
    ["wrong amount", { unit_amount: 1200 }],
    ["one-time", { type: "one_time", recurring: null }],
    ["wrong interval", { recurring: { interval: "year", interval_count: 1 } }],
  ])("rejects %s prices", (_label, overrides) => {
    expect(stripePriceMatchesPlan(price(overrides as Partial<Stripe.Price>), planOption("monthly"))).toBe(false);
  });
});
