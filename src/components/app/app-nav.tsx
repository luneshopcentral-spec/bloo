"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Pill, LogOut, LayoutDashboard } from "lucide-react";
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
    <nav className="border-b border-slate-200 bg-white">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-slate-900">
              DispenseRx<span className="text-emerald-600"> Practice</span>
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-500 sm:block">
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
