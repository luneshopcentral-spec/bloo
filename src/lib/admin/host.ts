// The admin portal is served from the `admin.` subdomain of the same Next.js
// deployment. Middleware rewrites that host into the internal `/admin/*` route
// tree, and blocks those paths on the primary host, so the portal is reachable
// only through the subdomain and carries its own cookie scope (its own login).
//
// Detection: the first DNS label is `admin` (covers admin.localhost for local
// dev and admin.example.com in production), or an explicit NEXT_PUBLIC_ADMIN_HOST
// override for hosts that do not follow that shape.
export function isAdminHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0].toLowerCase();
  const configured = process.env.NEXT_PUBLIC_ADMIN_HOST?.toLowerCase();
  if (configured && hostname === configured) return true;
  return hostname.split(".")[0] === "admin";
}
