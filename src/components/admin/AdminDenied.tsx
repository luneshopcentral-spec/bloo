"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

/** Shown when a signed-in account reaches the portal without the admin role. We
 * render (rather than redirect) to avoid an auth/redirect loop with middleware. */
export function AdminDenied({ email }: { email: string }) {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold">Not authorised</h1>
        <p className="mt-2 text-sm text-slate-600">
          {email || "This account"} does not have administrator access.
        </p>
        <Button onClick={signOut} variant="outline" className="mt-6 w-full">
          Sign out
        </Button>
      </div>
    </main>
  );
}
