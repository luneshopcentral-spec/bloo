import { getPaidReleaseReadiness } from "./editorial";
import { SITE_CONFIG } from "@/lib/site-config";

export function paidAccessAvailable(): boolean {
  return process.env.STRIPE_TEST_MODE !== "true"
    && Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"))
    && getPaidReleaseReadiness().ready
    && Boolean(SITE_CONFIG.supportEmail && process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME?.trim())
    && /^https:\/\//.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")
    && process.env.PAID_LAUNCH_APPROVED === "true"
    && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID_MONTHLY && process.env.STRIPE_PRICE_ID_YEARLY);
}

/** Server-only: expose the mode, never the keys, to browser components. */
export function checkoutAvailability(): { available: boolean; testMode: boolean } {
  const testMode = process.env.STRIPE_TEST_MODE === "true"
    && Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
      && process.env.STRIPE_WEBHOOK_SECRET
      && process.env.STRIPE_PRICE_ID_MONTHLY
      && process.env.STRIPE_PRICE_ID_YEARLY);
  return { available: testMode || paidAccessAvailable(), testMode };
}
