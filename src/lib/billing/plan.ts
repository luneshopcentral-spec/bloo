/**
 * Display-only plan details for the pricing page and upgrade prompts.
 *
 * IMPORTANT: these strings are what the customer *sees*. The amount actually
 * charged comes from the Stripe Price behind `STRIPE_PRICE_ID`. Keep the two in
 * sync — update `priceDisplay`/`interval` here to match the Stripe Price you
 * create in the dashboard.
 */
export const PLAN = {
  name: "Full access",
  priceDisplay: "A$12",
  interval: "month",
} as const;
