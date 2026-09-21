"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminPost } from "@/lib/admin/client-api";
import { formatDateTime, isFuture } from "@/lib/admin/format";
import { absoluteUrl } from "@/lib/site-config";

export interface AccessCodeRow {
  code: string;
  description: string | null;
  grantsDays: number;
  grantsMinutes: number;
  assignedEmail: string | null;
  maxRedemptions: number | null;
  redemptions: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TRIAL-";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

export function CodesManager({ rows }: { rows: AccessCodeRow[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  useEffect(() => {
    setCode(randomCode());
  }, []);
  const [description, setDescription] = useState("");
  const [grantsDays, setGrantsDays] = useState(14);
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [unit, setUnit] = useState("days");
  const [expiresAt, setExpiresAt] = useState("");
  const [assignedEmail, setAssignedEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await adminPost("/api/admin/codes", {
      action: "create",
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      grantsMinutes:
        grantsDays * (unit === "days" ? 1440 : unit === "hours" ? 60 : 1),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      assignedEmail: assignedEmail.trim() || null,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
    });
    setBusy(false);
    if (result.ok) {
      setMessage({ text: `Created ${code.trim().toUpperCase()}`, ok: true });
      setCode(randomCode());
      setDescription("");
      setMaxRedemptions("1");
      router.refresh();
    } else {
      setMessage({ text: result.error ?? "Failed", ok: false });
    }
  }

  async function toggle(row: AccessCodeRow) {
    setBusy(true);
    const result = await adminPost("/api/admin/codes", {
      action: "set_active",
      code: row.code,
      active: !row.active,
    });
    setBusy(false);
    setMessage({
      text: result.ok
        ? `${row.code} ${row.active ? "deactivated" : "reactivated"}. Existing grants are unchanged.`
        : (result.error ?? "Update failed"),
      ok: result.ok,
    });
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-4 font-medium">New access code</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <div className="mt-1 flex gap-1">
              <Input
                id="code"
                required
                maxLength={32}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCode(randomCode())}
                aria-label="Generate a random access code"
                title="Generate"
              >
                ↻
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="days">Access duration</Label>
            <div className="mt-1 flex gap-2">
              <Input
                required
                id="days"
                type="number"
                min={unit === "minutes" ? 15 : 1}
                max={unit === "days" ? 365 : unit === "hours" ? 8760 : 525600}
                value={grantsDays}
                onChange={(e) => setGrantsDays(Number(e.target.value))}
              />
              <select
                aria-label="Duration unit"
                className="rounded-md border px-2"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
                <option value="minutes">Minutes</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="max">Max redemptions</Label>
            <Input
              id="max"
              type="number"
              min={1}
              placeholder="Unlimited"
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="desc">Note (optional)</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder="e.g. Monash cohort"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code-expiry">
              Redeem before (optional, your local time)
            </Label>
            <Input
              className="mt-1"
              id="code-expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="code-email">
              Restrict to account email (optional)
            </Label>
            <Input
              className="mt-1"
              id="code-email"
              type="email"
              maxLength={254}
              placeholder="Any registered user"
              value={assignedEmail}
              onChange={(e) => setAssignedEmail(e.target.value)}
            />
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-600">
          Access starts when redeemed. A grant never shortens existing access.
          Each user can redeem a code once. Deactivating a code stops future
          redemptions; revoke an existing grant from the user’s account.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={busy}>
            {busy ? "Creating…" : "Create code"}
          </Button>
          {message && (
            <span
              role="status"
              className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}
            >
              {message.text}
            </span>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Grants</th>
              <th className="px-4 py-3">Redeemed</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const expired = row.expiresAt && !isFuture(row.expiresAt);
              const full =
                row.maxRedemptions !== null &&
                row.redemptions >= row.maxRedemptions;
              return (
                <tr
                  key={row.code}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/codes/${encodeURIComponent(row.code)}`}
                      className="font-mono font-medium text-blue-700 hover:underline"
                    >
                      {row.code}
                    </Link>
                    {row.description && (
                      <div className="text-xs text-slate-600">
                        {row.description}
                      </div>
                    )}
                    {row.assignedEmail && (
                      <div className="text-xs text-slate-600">
                        For {row.assignedEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.grantsMinutes % 1440 === 0
                      ? `${row.grantsMinutes / 1440} days`
                      : row.grantsMinutes % 60 === 0
                        ? `${row.grantsMinutes / 60} hours`
                        : `${row.grantsMinutes} minutes`}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.redemptions}
                    {row.maxRedemptions !== null
                      ? ` / ${row.maxRedemptions}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.expiresAt ? formatDateTime(row.expiresAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!row.active ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        Inactive
                      </span>
                    ) : expired ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        Expired
                      </span>
                    ) : full ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        Full
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!row.active || Boolean(expired) || full}
                      aria-label={`Copy joining instructions for ${row.code}`}
                      onClick={async () => {
                        const duration = row.grantsMinutes % 1440 === 0 ? `${row.grantsMinutes / 1440} days` : row.grantsMinutes % 60 === 0 ? `${row.grantsMinutes / 60} hours` : `${row.grantsMinutes} minutes`;
                        const invitation = [
                          "You are invited to test DispenseRx Practice on a laptop or desktop.",
                          `1. Create your account at ${absoluteUrl("/sign-up")} and confirm your email if prompted.`,
                          `2. Sign in and open ${absoluteUrl("/dashboard#access-code")}. Enter ${row.code} under Student access code.`,
                          `Your access lasts ${duration} from redemption. No card, payment or subscription is needed.`,
                          row.expiresAt ? `Redeem before ${formatDateTime(row.expiresAt)}.` : "",
                          row.assignedEmail ? `Use the account email ${row.assignedEmail}.` : "",
                          "3. Open the simulator and choose Guided tutorial, then try a case in Practice mode.",
                          `4. Send feedback at ${absoluteUrl("/account#report")}. Include the case number, what you tried and what you expected. Use fictional patient details only.`,
                          "This is beta training software. Check clinical guidance with your educator and current references.",
                        ].filter(Boolean).join("\n");
                        try {
                          await navigator.clipboard.writeText(invitation);
                          setMessage({ text: `Joining instructions copied for ${row.code}. You can paste them into your group invitation.`, ok: true });
                        } catch {
                          setMessage({ text: "Copy failed. Share the code and ask students to redeem it on their dashboard.", ok: false });
                        }
                      }}
                    >Copy invite</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Copy ${row.code}`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(row.code);
                          setMessage({ text: `Copied ${row.code}`, ok: true });
                        } catch {
                          setMessage({
                            text: "Copy failed. Select the code and copy it manually.",
                            ok: false,
                          });
                        }
                      }}
                    >
                      Copy
                    </Button>
                    <Button
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(row)}
                    >
                      {row.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-600"
                >
                  No codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
