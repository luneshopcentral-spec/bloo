"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminPost } from "@/lib/admin/client-api";
import { formatDate, isFuture } from "@/lib/admin/format";

export interface AccessCodeRow {
  code: string;
  description: string | null;
  grantsDays: number;
  maxRedemptions: number | null;
  redemptions: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TRIAL-";
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function CodesManager({ rows }: { rows: AccessCodeRow[] }) {
  const router = useRouter();
  const [code, setCode] = useState(randomCode());
  const [description, setDescription] = useState("");
  const [grantsDays, setGrantsDays] = useState(14);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await adminPost("/api/admin/codes", {
      action: "create",
      code: code.trim().toUpperCase(),
      description: description.trim() || undefined,
      grantsDays,
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
    });
    setBusy(false);
    if (result.ok) {
      setMessage({ text: `Created ${code.trim().toUpperCase()}`, ok: true });
      setCode(randomCode());
      setDescription("");
      setMaxRedemptions("");
      router.refresh();
    } else {
      setMessage({ text: result.error ?? "Failed", ok: false });
    }
  }

  async function toggle(row: AccessCodeRow) {
    await adminPost("/api/admin/codes", { action: "set_active", code: row.code, active: !row.active });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-medium">New access code</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="code">Code</Label>
            <div className="mt-1 flex gap-1">
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
              <Button type="button" variant="ghost" onClick={() => setCode(randomCode())} title="Generate">↻</Button>
            </div>
          </div>
          <div>
            <Label htmlFor="days">Grants (days)</Label>
            <Input id="days" type="number" min={1} max={365} value={grantsDays} onChange={(e) => setGrantsDays(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="max">Max redemptions</Label>
            <Input id="max" type="number" min={1} placeholder="Unlimited" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="desc">Note (optional)</Label>
            <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monash cohort" className="mt-1" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create code"}</Button>
          {message && <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</span>}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
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
              const full = row.maxRedemptions !== null && row.redemptions >= row.maxRedemptions;
              return (
                <tr key={row.code} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{row.code}</span>
                    {row.description && <div className="text-xs text-slate-500">{row.description}</div>}
                  </td>
                  <td className="px-4 py-3">{row.grantsDays} days</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.redemptions}{row.maxRedemptions !== null ? ` / ${row.maxRedemptions}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{row.expiresAt ? formatDate(row.expiresAt) : "—"}</td>
                  <td className="px-4 py-3">
                    {!row.active ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Inactive</span>
                    ) : expired ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Expired</span>
                    ) : full ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Full</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => toggle(row)}>
                      {row.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No codes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
