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
      <h2 className="mb-4 font-medium">Manage account</h2>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Grant trial (days)</label>
            <Input
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
            disabled={busy !== null}
            onClick={() => run("grant", { action: "grant_comp", days: compDays })}
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
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
      )}
    </div>
  );
}
