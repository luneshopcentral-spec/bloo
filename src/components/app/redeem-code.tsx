"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RedeemCode({ activeUntil }: { activeUntil: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const activeLabel =
    activeUntil && Date.parse(activeUntil) > Date.now()
      ? new Date(activeUntil).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
      : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
        setMessage({ text: "Access unlocked. Enjoy!", ok: true });
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
          Trial access is active until {activeLabel}.
        </p>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Enter access code"
          className="max-w-xs font-mono"
          aria-label="Access code"
        />
        <Button type="submit" disabled={busy || code.trim().length < 3}>
          {busy ? "Redeeming…" : "Redeem"}
        </Button>
      </form>
      {message && <p className={`mt-2 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}
