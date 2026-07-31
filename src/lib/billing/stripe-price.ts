import type Stripe from "stripe";
import type { PlanOption } from "@/lib/billing/plan";

export function stripePriceMatchesPlan(
  price: Stripe.Price,
  plan: PlanOption
): boolean {
  return price.active
    && price.type === "recurring"
    && price.currency.toLowerCase() === "aud"
    && price.unit_amount === plan.priceCents
    && price.recurring?.interval === plan.interval
    && price.recurring.interval_count === 1;
}
