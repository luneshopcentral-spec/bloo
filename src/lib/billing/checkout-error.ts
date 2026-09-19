/** Only return allowlisted categories; never expose Stripe's raw error to users. */
export function checkoutErrorReason(error: unknown): "terms" | "price" | "customer" | "configuration" | "error" {
  if (!error || typeof error !== "object") return "error";
  const { type, code, param, message } = error as Record<string, unknown>;
  if (type === "StripeAuthenticationError" || type === "StripePermissionError") return "configuration";
  if (type !== "StripeInvalidRequestError") return "error";
  if ((typeof param === "string" && param.includes("terms_of_service"))
    || (typeof message === "string" && /terms.of.service.*(url|settings)|(url|settings).*terms.of.service/i.test(message))) return "terms";
  if (code === "resource_missing" && param === "customer") return "customer";
  if (code === "resource_missing" && typeof param === "string" && param.includes("price")) return "price";
  return "error";
}
