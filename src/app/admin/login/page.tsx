"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const denied = params.get("denied") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError, data } = await supabase.auth.signInWithPassword({ email, password }).catch(() => ({ error: new Error("Network error"), data: { user: null } }));
    if (signInError) {
      setLoading(false);
      setError("Those credentials were not accepted.");
      return;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user!.id).single();
    if (profileError || profile?.role !== "admin") {
      await supabase.auth.signOut();
      setPassword("");
      setLoading(false);
      setError("This account does not have administrator access.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Admin portal</h1>
            <p className="text-xs text-slate-600">Authorised operators only</p>
          </div>
        </div>

        {denied && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            That account is signed in but is not an administrator.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : "Sign in"}
          </Button>
        </form>
        {process.env.NEXT_PUBLIC_SITE_URL && <a className="mt-4 block text-center text-sm text-slate-600 underline" href={`${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/forgot-password`}>Reset your password on the main site</a>}
      </div>
    </main>
  );
}
