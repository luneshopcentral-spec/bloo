"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  ListChecks,
  Megaphone,
  Ticket,
  SlidersHorizontal,
  LogOut,
  ShieldCheck,
  History,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/cases", label: "Cases", icon: BookOpen },
  { href: "/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/codes", label: "Access codes", icon: Ticket },
  { href: "/audit", label: "Admin activity", icon: History },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

// Middleware rewrites the admin.* subdomain onto the internal /admin tree, so
// the browser path may or may not carry the /admin prefix depending on how the
// route resolved. Normalise it before matching nav links.
function normalise(pathname: string): string {
  const stripped = pathname.replace(/^\/admin(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = normalise(usePathname() ?? "/");
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    const { error } = await createClient().auth.signOut().catch(() => ({ error: true }));
    if (error) { setSigningOut(false); setSignOutError(true); return; }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <a href="#admin-content" className="skip-link">Skip to admin content</a>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-semibold">Admin</span>
        </div>
        <nav aria-label="Admin navigation" className="flex-1 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="truncate px-3 text-xs text-slate-600" title={email}>{email}</p>
          <button
            onClick={signOut}
            disabled={signingOut}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          {signOutError && <p role="alert" className="px-3 text-xs text-red-700">Sign-out failed. Please try again.</p>}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top nav */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 md:hidden">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-slate-900 text-white" : "text-slate-600"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
        <main id="admin-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
