import Stripe from "stripe";
import type { PlanId } from "@/lib/billing/plan";

let cached: Stripe | null = null;

/** Server-only Stripe client. Reads the secret key lazily so a missing env var
 * surfaces as a clear runtime error on the billing routes rather than at build. */
export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  cached = new Stripe(key);
  return cached;
}

const PRICE_ID_ENV_VAR: Record<PlanId, string> = {
  monthly: "STRIPE_PRICE_ID_MONTHLY",
  yearly: "STRIPE_PRICE_ID_YEARLY",
};

export function stripePriceId(plan: PlanId): string {
  const envVar = PRICE_ID_ENV_VAR[plan];
  const id = process.env[envVar];
  if (!id) throw new Error(`${envVar} is not set`);
  return id;
}

/** Absolute base URL for Stripe success/cancel redirects. Set NEXT_PUBLIC_SITE_URL
 * in production; falls back to localhost for development. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
