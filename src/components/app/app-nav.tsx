"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Pill, LogOut, LayoutDashboard, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface AppNavProps {
  userEmail: string;
}

export function AppNav({ userEmail }: AppNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // The simulator owns the full laptop viewport and provides its own exit control.
  if (pathname === "/practice") return null;

  return (
    <nav aria-label="Main navigation" className="border-b border-slate-200 bg-white">
      <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/" className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-700" />
            <span className="font-bold text-slate-900">
              DispenseRx<span className="text-emerald-700"> Practice</span>
            </span>
          </Link>

          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 text-sm font-medium hover:text-slate-900 ${pathname === "/dashboard" ? "text-emerald-700" : "text-slate-600"}`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            href="/quiz"
            className={`flex items-center gap-1.5 text-sm font-medium hover:text-slate-900 ${pathname === "/quiz" ? "text-emerald-700" : "text-slate-600"}`}
          >
            <BrainCircuit className="h-4 w-4" />
            Consultation quizzes
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/account" className="text-sm font-medium text-emerald-800 hover:underline">Account & help</Link>
          <span className="hidden max-w-48 truncate text-sm text-slate-600 lg:block">
            {userEmail}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </nav>
  );
}
