"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPost } from "@/lib/admin/client-api";

export function UserActions({
  userId,
  role,
  compActive,
  isSelf,
}: {
  userId: string;
  role: string;
  compActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [compDays, setCompDays] = useState(14);

  async function run(label: string, body: unknown, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(label);
    setMessage(null);
    const result = await adminPost("/api/admin/users", { userId, ...(body as object) });
    setBusy(null);
    if (result.ok) {
      setMessage({ text: "Done.", ok: true });
      router.refresh();
    } else {
      setMessage({ text: result.error ?? "Failed", ok: false });
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-2 font-medium">Manage account</h2><p className="mb-4 text-sm text-slate-600">Grants never shorten existing access. Revoking a trial does not cancel a paid subscription. Changes are recorded in the audit log.</p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor="grant-days" className="mb-1 block text-xs text-slate-600">Minimum access from today (days)</label>
            <Input
              id="grant-days"
              type="number"
              min={1}
              max={365}
              value={compDays}
              onChange={(event) => setCompDays(Number(event.target.value))}
              className="w-24"
            />
          </div>
          <Button
            variant="outline"
            disabled={busy !== null || !Number.isInteger(compDays) || compDays < 1 || compDays > 365}
            onClick={() => run("grant", { action: "grant_comp", minutes: compDays * 1440 })}
          >
            Grant access
          </Button>
          {compActive && (
            <Button
              variant="ghost"
              disabled={busy !== null}
              onClick={() => run("revoke", { action: "revoke_comp" }, "Revoke this user's trial access now?")}
            >
              Revoke trial
            </Button>
          )}
        </div>

        <div className="flex items-end gap-2">
          {role === "admin" ? (
            <Button
              variant="outline"
              disabled={busy !== null || isSelf}
              title={isSelf ? "You cannot remove your own admin role" : undefined}
              onClick={() => run("role", { action: "set_role", role: "student" }, "Remove admin role from this user?")}
            >
              Revoke admin
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => run("role", { action: "set_role", role: "admin" }, "Grant admin access to this user?")}
            >
              Make admin
            </Button>
          )}

          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={busy !== null}
            onClick={() =>
              run(
                "reset",
                { action: "reset_progress" },
                "Delete ALL practice and quiz history for this user? This cannot be undone."
              )
            }
          >
            Reset progress
          </Button>
        </div>
      </div>
      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
      )}
    </div>
  );
}
