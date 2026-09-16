const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

export const SITE_CONFIG = {
  name: "DispenseRx Practice",
  description:
    "Australian dispensing workflow practice with realistic cases, explicit safety decisions and immediate feedback.",
  url: configuredSiteUrl || "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null,
  legalBusinessName:
    process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME?.trim() || "DispenseRx Practice",
  pricesIncludeGst:
    process.env.NEXT_PUBLIC_PRICES_INCLUDE_GST?.trim().toLowerCase() === "true",
  supportResponseTime: "within two business days during the beta",
} as const;

export function absoluteUrl(path = "/"): string {
  return new URL(path, SITE_CONFIG.url).toString();
}

