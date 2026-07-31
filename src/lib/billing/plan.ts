export type PlanId = "monthly" | "yearly";

export interface PlanOption {
  id: PlanId;
  name: string;
  shortName: string;
  /**
   * Display-only price shown on the pricing page and upgrade prompts.
   * IMPORTANT: this is what the customer *sees*. The amount actually charged
   * comes from the matching Stripe Price (STRIPE_PRICE_ID_MONTHLY /
   * STRIPE_PRICE_ID_YEARLY). Keep these in sync with the real Stripe Prices.
   */
  priceDisplay: string;
  priceCents: number;
  interval: "month" | "year";
  /** Optional short badge, e.g. a savings callout on the annual plan. */
  badge?: string;
}

export const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "monthly",
    name: "Full access — Monthly",
    shortName: "Monthly",
    priceDisplay: "A$13",
    priceCents: 1300,
    interval: "month",
  },
  {
    id: "yearly",
    name: "Full access — Annual",
    shortName: "Annual",
    priceDisplay: "A$130",
    priceCents: 13000,
    interval: "year",
    badge: "2 months free",
  },
];

export function isPlanId(value: unknown): value is PlanId {
  return value === "monthly" || value === "yearly";
}

export function planOption(id: PlanId): PlanOption {
  return PLAN_OPTIONS.find((plan) => plan.id === id)!;
}

export function monthlyEquivalent(plan: PlanOption): string {
  const monthlyCents = plan.interval === "year"
    ? Math.round(plan.priceCents / 12)
    : plan.priceCents;
  return `A$${(monthlyCents / 100).toFixed(2)}`;
}
