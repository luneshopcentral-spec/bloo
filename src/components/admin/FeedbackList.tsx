"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminPost } from "@/lib/admin/client-api";
import { formatDateTime } from "@/lib/admin/format";

export interface FeedbackItem {
  id: string;
  kind: string;
  caseId: string | null;
  message: string;
  status: string;
  createdAt: string;
  email: string;
}

const STATUS_TABS: Array<{ value: string | null; label: string }> = [
  { value: null, label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

const KIND_STYLE: Record<string, string> = {
  content: "bg-purple-100 text-purple-800",
  bug: "bg-red-100 text-red-800",
  privacy: "bg-slate-200 text-slate-700",
  other: "bg-slate-100 text-slate-600",
};

export function FeedbackList({ items, activeFilter }: { items: FeedbackItem[]; activeFilter: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    const result = await adminPost("/api/admin/feedback", { id, status });
    setBusy(null);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {STATUS_TABS.map((tab) => {
          const active = activeFilter === tab.value;
          const href = tab.value ? `/feedback?status=${tab.value}` : "/feedback";
          return (
            <Link
              key={tab.label}
              href={href}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                active ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 && <p className="text-sm text-slate-500">No feedback in this view.</p>}

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_STYLE[item.kind] ?? "bg-slate-100"}`}>
                {item.kind}
              </span>
              {item.caseId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{item.caseId}</span>}
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[item.status] ?? "bg-slate-100"}`}>
                {item.status.replace("_", " ")}
              </span>
              <span className="ml-auto text-xs text-slate-400">{formatDateTime(item.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-800">{item.message}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">{item.email}</span>
              <div className="ml-auto flex gap-1">
                {["open", "in_progress", "resolved"]
                  .filter((s) => s !== item.status)
                  .map((s) => (
                    <button
                      key={s}
                      disabled={busy === item.id}
                      onClick={() => setStatus(item.id, s)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Mark {s.replace("_", " ")}
                    </button>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
