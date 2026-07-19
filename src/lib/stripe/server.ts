import Stripe from "stripe";

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

export function stripePriceId(): string {
  const id = process.env.STRIPE_PRICE_ID;
  if (!id) throw new Error("STRIPE_PRICE_ID is not set");
  return id;
}

/** Absolute base URL for Stripe success/cancel redirects. Set NEXT_PUBLIC_SITE_URL
 * in production; falls back to localhost for development. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
