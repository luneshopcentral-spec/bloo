import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-31T00:00:00+09:30");
  return [
    { url: SITE_CONFIG.url, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_CONFIG.url}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_CONFIG.url}/terms`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_CONFIG.url}/refund-policy`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_CONFIG.url}/support`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
