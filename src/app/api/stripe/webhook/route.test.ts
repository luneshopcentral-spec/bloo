import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/billing/lock", () => ({ withBillingLock: async (_key: string, work: () => Promise<unknown>) => work() }));
vi.mock("@/lib/stripe/server", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

type EventLog = {
  id: string;
  event_type: string;
  status: "processing" | "processed" | "failed";
  attempts: number;
  error_message?: string | null;
  processed_at?: string | null;
};

function subscription(status: Stripe.Subscription.Status = "active") {
  return {
    id: "sub_123",
    customer: "cus_123",
    status,
    metadata: { plan: "monthly", supabase_user_id: "user_123" },
    cancel_at_period_end: false,
    items: { data: [{ current_period_start: 1_797_321_600, current_period_end: 1_800_000_000 }] },
  } as unknown as Stripe.Subscription;
}

function event(type: Stripe.Event.Type, object: unknown, id = "evt_123") {
  return { id, type, data: { object } } as Stripe.Event;
}

function adminHarness() {
  const logs = new Map<string, EventLog>();
  const profiles = new Map<string, Record<string, unknown>>();
  let failProfileUpdate = false;

  const admin = {
    from(table: string) {
      if (table === "stripe_webhook_events") {
        return {
          select() {
            return { eq: (_column: string, id: string) => ({ maybeSingle: async () => ({ data: logs.get(id) ?? null, error: null }) }) };
          },
          async upsert(row: EventLog) {
            logs.set(row.id, { ...logs.get(row.id), ...row });
            return { error: null };
          },
          update(values: Partial<EventLog>) {
            return { eq: async (_column: string, id: string) => {
              const current = logs.get(id);
              if (current) logs.set(id, { ...current, ...values });
              return { error: null };
            } };
          },
        };
      }
      if (table === "profiles") {
        return {
          select() {
            return { eq: () => ({ maybeSingle: async () => ({ data: { id: "user_123" }, error: null }) }) };
          },
          update(values: Record<string, unknown>) {
            return { eq: (_column: string, id: string) => ({ select: () => ({ single: async () => {
              if (failProfileUpdate) return { data: null, error: { message: "simulated database failure" } };
              profiles.set(id, { ...profiles.get(id), ...values });
              return { data: { id }, error: null };
            } }) }) };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    admin,
    logs,
    profiles,
    setProfileFailure(value: boolean) { failProfileUpdate = value; },
  };
}

function webhookRequest() {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: "{}",
  });
}

describe("Stripe webhook reliability", () => {
  let currentEvent: Stripe.Event;
  let currentSubscription: Stripe.Subscription;
  let subscriptionList: Stripe.Subscription[] | null;
  let harness: ReturnType<typeof adminHarness>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    currentSubscription = subscription();
    subscriptionList = null;
    currentEvent = event("checkout.session.completed", {
      id: "cs_123",
      subscription: "sub_123",
      client_reference_id: "user_123",
      metadata: { supabase_user_id: "user_123", plan: "monthly" },
    });
    harness = adminHarness();
    vi.mocked(createAdminClient).mockReturnValue(harness.admin as never);
    vi.mocked(getStripe).mockReturnValue({
      webhooks: { constructEvent: () => currentEvent },
      subscriptions: { retrieve: async () => currentSubscription, list: async () => ({ data: subscriptionList ?? [currentSubscription], has_more: false }) },
    } as never);
  });

  it("grants access and records the complete subscription after checkout", async () => {
    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(harness.profiles.get("user_123")).toMatchObject({
      has_paid: true,
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      subscription_plan: "monthly",
      subscription_status: "active",
      subscription_current_period_start: new Date(1_797_321_600_000).toISOString(),
      subscription_current_period_end: new Date(1_800_000_000_000).toISOString(),
    });
    expect(harness.logs.get("evt_123")).toMatchObject({ status: "processed", attempts: 1 });
  });

  it("revokes access when a subscription is cancelled", async () => {
    currentSubscription = subscription("canceled");
    currentEvent = event("customer.subscription.deleted", currentSubscription);
    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(harness.profiles.get("user_123")).toMatchObject({ has_paid: false, subscription_status: "canceled" });
  });

  it("revokes access after a failed payment makes the subscription past due", async () => {
    currentSubscription = subscription("past_due");
    currentEvent = event("invoice.payment_failed", { id: "in_123", subscription: "sub_123" });
    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);
    expect(harness.profiles.get("user_123")).toMatchObject({ has_paid: false, subscription_status: "past_due" });
  });

  it("returns 500 on a database failure, succeeds on retry, then ignores duplicates", async () => {
    currentEvent = event("customer.subscription.updated", currentSubscription, "evt_retry");
    harness.setProfileFailure(true);
    expect((await POST(webhookRequest())).status).toBe(500);
    expect(harness.logs.get("evt_retry")).toMatchObject({ status: "failed", attempts: 1 });

    harness.setProfileFailure(false);
    expect((await POST(webhookRequest())).status).toBe(200);
    expect(harness.logs.get("evt_retry")).toMatchObject({ status: "processed", attempts: 2 });

    const duplicateResponse = await POST(webhookRequest());
    expect(await duplicateResponse.json()).toMatchObject({ received: true, duplicate: true });
    expect(harness.logs.get("evt_retry")?.attempts).toBe(2);
  });

  it("handles modern invoices with a parent subscription reference", async () => {
    currentSubscription = subscription("past_due");
    currentEvent = event("invoice.payment_failed", { id: "in_modern", parent: { type: "subscription_details", subscription_details: { subscription: "sub_123" } } });
    expect((await POST(webhookRequest())).status).toBe(200);
    expect(harness.profiles.get("user_123")?.has_paid).toBe(false);
  });

  it("does not restore access when an old active event arrives after cancellation", async () => {
    currentSubscription = subscription("canceled");
    currentEvent = event("customer.subscription.deleted", currentSubscription, "evt_cancel");
    expect((await POST(webhookRequest())).status).toBe(200);
    currentEvent = event("customer.subscription.updated", subscription("active"), "evt_old");
    expect((await POST(webhookRequest())).status).toBe(200);
    expect(harness.profiles.get("user_123")?.has_paid).toBe(false);
  });

  it("keeps a replacement subscription active when the old subscription is cancelled", async () => {
    currentSubscription = subscription("canceled");
    subscriptionList = [currentSubscription, { ...subscription(), id: "sub_replacement" }];
    currentEvent = event("customer.subscription.deleted", currentSubscription);
    expect((await POST(webhookRequest())).status).toBe(200);
    expect(harness.profiles.get("user_123")).toMatchObject({ has_paid: true, stripe_subscription_id: "sub_replacement" });
  });
});
