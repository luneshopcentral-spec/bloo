"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RedeemCode({ activeUntil }: { activeUntil: string | null }) {
  const router = useRouter();
  const fieldId = useId();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [grantedUntil, setGrantedUntil] = useState<string | null>(null);
  const accessUntil = grantedUntil ?? activeUntil;

  const activeLabel =
    accessUntil && Date.parse(accessUntil) > Date.now()
      ? new Date(accessUntil).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney", timeZoneName: "short" })
      : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || code.trim().length < 3) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setGrantedUntil(typeof data.grantedUntil === "string" ? data.grantedUntil : null);
        setMessage({ text: "Your code has been redeemed. Full access is ready — you can start practising now.", ok: true });
        setCode("");
        router.refresh();
      } else {
        setMessage({ text: (data as { error?: string }).error ?? "Could not redeem that code.", ok: false });
      }
    } catch {
      setMessage({ text: "Network error. Please try again.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {activeLabel && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Student access is active until {activeLabel}. It ends automatically; there is no payment or automatic subscription.
        </p>
      )}
      <form onSubmit={submit}>
        <label htmlFor={fieldId} className="mb-2 block text-sm font-medium text-slate-800">Student access code</label>
        <div className="flex flex-wrap gap-2">
        <Input
          id={fieldId}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Enter access code"
          className="max-w-xs font-mono"
          aria-label="Access code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={busy}
          maxLength={32}
        />
        <Button type="submit" className="bg-emerald-800 text-white hover:bg-emerald-900" disabled={busy || code.trim().length < 3}>
          {busy ? "Redeeming…" : "Unlock access"}
        </Button>
        </div>
      </form>
      {message && <p role="status" className={`mt-2 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
      {message?.ok && <Link href="/practice" className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline">Start practising →</Link>}
    </div>
  );
}
