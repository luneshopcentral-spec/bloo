"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPost } from "@/lib/admin/client-api";

// Irreversible account deletion, gated behind typing the exact email so it can't
// be fired by a stray click. Self-deletion is blocked here and on the server.
export function DeleteAccount({ userId, email, isSelf }: { userId: string; email: string; isSelf: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirm.trim().toLowerCase() === email.toLowerCase();

  async function remove() {
    if (!matches || busy) return;
    if (!window.confirm(`Permanently delete ${email}? This removes the account and all of its practice history and cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    const result = await adminPost("/api/admin/users/delete", { userId, confirmEmail: confirm.trim().toLowerCase() });
    if (result.ok) {
      router.replace("/users");
      router.refresh();
    } else {
      setBusy(false);
      setError(result.error ?? "Delete failed.");
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
      <h2 className="font-medium text-red-800">Danger zone</h2>
      {isSelf ? (
        <p className="mt-1 text-sm text-red-700">You cannot delete your own account.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-red-700">
            Permanently delete this account and all of its practice and quiz history. This cannot be undone.
            Type <span className="font-mono font-semibold">{email}</span> to confirm.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Type the email to confirm"
              aria-label="Confirm account email"
              autoComplete="off"
              className="max-w-xs bg-white"
            />
            <Button
              variant="destructive"
              disabled={!matches || busy}
              onClick={remove}
            >
              {busy ? "Deleting…" : "Delete account"}
            </Button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </>
      )}
    </div>
  );
}
