import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { pendingCheckoutUrl } from "./pending-checkout";

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_monthly",
    url: "https://checkout.stripe.com/monthly",
    mode: "subscription",
    metadata: { supabase_user_id: "user_test", plan: "monthly" },
    line_items: { has_more: false, data: [{ price: { id: "price_monthly" }, quantity: 1 }] },
    ...overrides,
  } as Stripe.Checkout.Session;
}

function client(sessions: Stripe.Checkout.Session[]) {
  const expire = vi.fn().mockResolvedValue({});
  const list = vi.fn().mockReturnValue((async function* () { yield* sessions; })());
  return { stripe: { checkout: { sessions: { list, expire } } } as unknown as Stripe, expire };
}

describe("pending checkout selection", () => {
  it("reuses an exact plan and price match", async () => {
    const { stripe, expire } = client([session()]);
    expect(await pendingCheckoutUrl(stripe, "cus_test", "user_test", "monthly", "price_monthly"))
      .toBe("https://checkout.stripe.com/monthly");
    expect(expire).not.toHaveBeenCalled();
  });

  it("expires monthly checkout when annual is selected", async () => {
    const { stripe, expire } = client([session()]);
    expect(await pendingCheckoutUrl(stripe, "cus_test", "user_test", "yearly", "price_yearly")).toBeNull();
    expect(expire).toHaveBeenCalledWith("cs_monthly");
  });

  it("expires a replaced price even when the plan name still matches", async () => {
    const { stripe, expire } = client([session()]);
    expect(await pendingCheckoutUrl(stripe, "cus_test", "user_test", "monthly", "price_new")).toBeNull();
    expect(expire).toHaveBeenCalledWith("cs_monthly");
  });

  it("keeps one matching session and expires duplicate payable sessions", async () => {
    const { stripe, expire } = client([session(), session({ id: "cs_duplicate" })]);
    expect(await pendingCheckoutUrl(stripe, "cus_test", "user_test", "monthly", "price_monthly"))
      .toBe("https://checkout.stripe.com/monthly");
    expect(expire).toHaveBeenCalledExactlyOnceWith("cs_duplicate");
  });

  it("does not reuse or expire sessions belonging to another integration", async () => {
    const { stripe, expire } = client([session({ metadata: {} }), session({ mode: "payment" })]);
    expect(await pendingCheckoutUrl(stripe, "cus_test", "user_test", "monthly", "price_monthly")).toBeNull();
    expect(expire).not.toHaveBeenCalled();
  });

  it("fails closed when the previous checkout cannot be expired", async () => {
    const { stripe, expire } = client([session()]);
    expire.mockRejectedValue(new Error("Expiry failed"));
    await expect(pendingCheckoutUrl(stripe, "cus_test", "user_test", "yearly", "price_yearly"))
      .rejects.toThrow("Expiry failed");
  });

  it("does not trust plan metadata without checking the actual line items", async () => {
    const { stripe, expire } = client([session({ line_items: undefined })]);
    expect(await pendingCheckoutUrl(stripe, "cus_test", "user_test", "monthly", "price_monthly")).toBeNull();
    expect(expire).toHaveBeenCalledWith("cs_monthly");
  });
});
