"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminPost } from "@/lib/admin/client-api";
import { formatDate } from "@/lib/admin/format";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  level: string;
  active: boolean;
  startsAt: string;
  endsAt: string | null;
}

const LEVELS = ["info", "success", "warning", "critical"] as const;
const LEVEL_STYLE: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
};

export function AnnouncementsManager({ rows }: { rows: AnnouncementRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("info");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await adminPost("/api/admin/announcements", { action: "create", title: title.trim(), body: body.trim(), level });
    setBusy(false);
    if (result.ok) {
      setTitle("");
      setBody("");
      setLevel("info");
      router.refresh();
    } else {
      setError(result.error ?? "Failed");
    }
  }

  async function act(action: string, id: string, extra: Record<string, unknown> = {}) {
    if (action === "delete" && !window.confirm("Delete this announcement permanently?")) return;
    setBusy(true);
    setError(null);
    const result = await adminPost("/api/admin/announcements", { action, id, ...extra });
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(result.error ?? "The announcement could not be updated.");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-medium">New announcement</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="body">Message</Label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={3}
              required
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <Label>Level</Label>
            <div className="mt-1 flex gap-1">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={level === l}
                  onClick={() => setLevel(l)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${level === l ? LEVEL_STYLE[l] : "bg-slate-100 text-slate-600"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800" disabled={busy}>{busy ? "Posting…" : "Post announcement"}</Button>
          {error && <span role="alert" className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[row.level] ?? "bg-slate-100"}`}>{row.level}</span>
              <span className="font-medium">{row.title}</span>
              {row.active ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Live</span>
              ) : (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Hidden</span>
              )}
              <span className="ml-auto text-xs text-slate-600">from {formatDate(row.startsAt)}{row.endsAt ? ` to ${formatDate(row.endsAt)}` : ""}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{row.body}</p>
            <div className="mt-3 flex justify-end gap-1">
              <Button disabled={busy} variant="ghost" size="sm" onClick={() => act("set_active", row.id, { active: !row.active })}>
                {row.active ? "Hide" : "Show"}
              </Button>
              <Button disabled={busy} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => act("delete", row.id)}>
                Delete
              </Button>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-600">No announcements yet.</p>}
      </div>
    </div>
  );
}
