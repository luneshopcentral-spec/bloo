import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin portal",
  robots: { index: false, follow: false },
};

// Root of the admin subtree. The primary <html>/<body> come from the app root
// layout; the portal chrome lives in (portal)/layout.tsx, which also enforces
// the admin role. This wrapper only scopes the background so the login page and
// the portal share one surface.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 text-slate-900">{children}</div>;
}
