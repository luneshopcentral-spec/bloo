// The admin portal is served from the `admin.` subdomain of the same Next.js
// deployment. Middleware rewrites that host into the internal `/admin/*` route
// tree, and blocks those paths on the primary host, so the portal is reachable
// only through the subdomain and carries its own cookie scope (its own login).
//
// Accept the exact configured host, or derive admin.<primary host>. Local
// development also accepts admin.localhost. Arbitrary admin.* hosts are rejected.
export function isAdminHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0].toLowerCase();
  const configured = process.env.NEXT_PUBLIC_ADMIN_HOST?.toLowerCase();
  if (configured) return hostname === configured;
  if (hostname === "admin.localhost" && process.env.NODE_ENV !== "production") return true;
  try {
    const primary = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").hostname;
    return hostname === `admin.${primary.replace(/^www\./, "")}`;
  } catch { return false; }
}
