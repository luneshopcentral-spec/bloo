"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPost } from "@/lib/admin/client-api";

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
];

export function GrantByEmail() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; id?: string } | null>(null);

  async function grant() {
    const trimmed = email.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setResult(null);
    const response = await adminPost("/api/admin/users/grant-by-email", { email: trimmed, minutes: days * 1440 });
    setBusy(false);
    if (response.ok) {
      const data = response.data as { email?: string; name?: string; id?: string };
      setResult({ ok: true, text: `Granted ${days}-day access to ${data.name || data.email || trimmed}.`, id: data.id });
      setEmail("");
      router.refresh();
    } else {
      setResult({ ok: false, text: response.error ?? "Could not grant access." });
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-medium">Grant access by email</h2>
      <p className="mt-1 text-sm text-slate-600">Unlock full access for an account without searching first. Grants never shorten an existing window and are audit-logged.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="grant-email" className="mb-1 block text-xs text-slate-600">Account email</label>
          <Input
            id="grant-email"
            type="email"
            autoComplete="off"
            placeholder="student@university.edu.au"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") grant(); }}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs text-slate-600">Duration</span>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                aria-pressed={days === preset.days}
                onClick={() => setDays(preset.days)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${days === preset.days ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <Button disabled={busy || !email.trim()} onClick={grant}>
          {busy ? "Granting…" : "Grant access"}
        </Button>
      </div>
      {result && (
        <p role="status" className={`mt-3 text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          {result.text}{" "}
          {result.ok && result.id && (
            <Link href={`/users/${result.id}`} className="font-medium underline">View account</Link>
          )}
        </p>
      )}
    </div>
  );
}
