import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutAvailability, paidAccessAvailable } from "./availability";
import { GET } from "@/app/api/availability/route";
import { getPaidReleaseReadiness } from "./editorial";

vi.mock("./editorial", () => ({ getPaidReleaseReadiness: vi.fn() }));
vi.mock("@/lib/site-config", () => ({ SITE_CONFIG: { supportEmail: "support@example.invalid" } }));

describe("sandbox checkout availability", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_TEST_MODE", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    vi.stubEnv("STRIPE_PRICE_ID_MONTHLY", "price_monthly");
    vi.stubEnv("STRIPE_PRICE_ID_YEARLY", "price_yearly");
    vi.stubEnv("PAID_LAUNCH_APPROVED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.invalid");
    vi.stubEnv("NEXT_PUBLIC_LEGAL_BUSINESS_NAME", "Test Operator");
    vi.mocked(getPaidReleaseReadiness).mockReturnValue({ ready: false, blockers: ["Pending review"] });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("allows configured sandbox checkout while live launch stays closed", () => {
    expect(checkoutAvailability()).toEqual({ available: true, testMode: true });
    expect(paidAccessAvailable()).toBe(false);
  });
  it.each(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID_MONTHLY", "STRIPE_PRICE_ID_YEARLY"])("requires %s for sandbox checkout", key => {
    vi.stubEnv(key, "");
    expect(checkoutAvailability()).toEqual({ available: false, testMode: false });
  });
  it("does not allow sandbox flags to activate a live key, even after live approval", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
    vi.stubEnv("PAID_LAUNCH_APPROVED", "true");
    vi.mocked(getPaidReleaseReadiness).mockReturnValue({ ready: true, blockers: [] });
    expect(checkoutAvailability().available).toBe(false);
  });
  it("requires the explicit sandbox flag for a test key", () => {
    vi.stubEnv("STRIPE_TEST_MODE", "false");
    vi.stubEnv("PAID_LAUNCH_APPROVED", "true");
    vi.mocked(getPaidReleaseReadiness).mockReturnValue({ ready: true, blockers: [] });
    expect(checkoutAvailability().available).toBe(false);
  });
  it("retains the live launch approval and review requirements", () => {
    vi.stubEnv("STRIPE_TEST_MODE", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
    expect(checkoutAvailability().available).toBe(false);
    vi.stubEnv("PAID_LAUNCH_APPROVED", "true");
    expect(checkoutAvailability().available).toBe(false);
    vi.mocked(getPaidReleaseReadiness).mockReturnValue({ ready: true, blockers: [] });
    expect(checkoutAvailability()).toEqual({ available: true, testMode: false });
  });
  it("exposes only availability flags through the uncached public endpoint", async () => {
    const response = GET();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ paidAccess: false, available: true, testMode: true });
  });
});
