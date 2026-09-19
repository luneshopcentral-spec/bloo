import type Stripe from "stripe";
import type { PlanId } from "./plan";

/** Keep one checkout for the requested price; invalidate abandoned plan choices. */
export async function pendingCheckoutUrl(
  stripe: Stripe,
  customerId: string,
  userId: string,
  plan: PlanId,
  priceId: string,
): Promise<string | null> {
  let reusable: string | null = null;
  const pending = stripe.checkout.sessions.list({
    customer: customerId,
    status: "open",
    limit: 100,
    expand: ["data.line_items"],
  });
  for await (const session of pending) {
    if (session.mode !== "subscription" || session.metadata?.supabase_user_id !== userId) continue;
    const items = session.line_items;
    const matches = session.metadata.plan === plan
      && items?.has_more === false
      && items.data.length === 1
      && items.data[0].price?.id === priceId
      && items.data[0].quantity === 1;
    if (!reusable && matches && session.url) {
      reusable = session.url;
    } else {
      // Do not leave an old monthly URL payable after the user chooses annual.
      // If expiry fails, abort instead of creating a second payable session.
      await stripe.checkout.sessions.expire(session.id);
    }
  }
  return reusable;
}
