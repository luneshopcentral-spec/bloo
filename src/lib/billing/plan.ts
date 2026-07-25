export type PlanId = "monthly" | "yearly";

export interface PlanOption {
  id: PlanId;
  name: string;
  /**
   * Display-only price shown on the pricing page and upgrade prompts.
   * IMPORTANT: this is what the customer *sees*. The amount actually charged
   * comes from the matching Stripe Price (STRIPE_PRICE_ID_MONTHLY /
   * STRIPE_PRICE_ID_YEARLY). Keep these in sync with the real Stripe Prices.
   */
  priceDisplay: string;
  interval: "month" | "year";
  /** Optional short badge, e.g. a savings callout on the annual plan. */
  badge?: string;
}

export const PLAN_OPTIONS: PlanOption[] = [
  { id: "monthly", name: "Full access — Monthly", priceDisplay: "A$12", interval: "month" },
  { id: "yearly", name: "Full access — Annual", priceDisplay: "A$99", interval: "year", badge: "Save ~30%" },
];

export function isPlanId(value: unknown): value is PlanId {
  return value === "monthly" || value === "yearly";
}

export function planOption(id: PlanId): PlanOption {
  return PLAN_OPTIONS.find((plan) => plan.id === id)!;
}
