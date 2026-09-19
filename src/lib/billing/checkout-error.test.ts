import { describe, expect, it } from "vitest";
import { checkoutErrorReason } from "./checkout-error";

describe("checkout error messages", () => {
  it("identifies a missing Stripe terms URL", () => {
    expect(checkoutErrorReason({ type: "StripeInvalidRequestError", message: "To require terms of service consent, set a terms of service URL in your Dashboard settings." })).toBe("terms");
    expect(checkoutErrorReason({ type: "StripeInvalidRequestError", param: "consent_collection[terms_of_service]" })).toBe("terms");
  });
  it.each([
    ["customer", "customer"], ["line_items[0][price]", "price"],
  ])("identifies missing %s configuration", (param, expected) => {
    expect(checkoutErrorReason({ type: "StripeInvalidRequestError", code: "resource_missing", param })).toBe(expected);
  });
  it("identifies API authentication failures without returning credentials", () => {
    expect(checkoutErrorReason({ type: "StripeAuthenticationError", message: "Invalid API key: secret-value" })).toBe("configuration");
  });
  it.each([null, "private error detail", new Error("private error detail"), { type: "StripeInvalidRequestError", message: "private error detail" }])("keeps unexpected error details private", error => {
    expect(checkoutErrorReason(error)).toBe("error");
  });
});
