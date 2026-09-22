"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminPost } from "@/lib/admin/client-api";
import { formatDateTime } from "@/lib/admin/format";

export interface UnmatchedItem {
  id: string;
  caseId: string;
  stage: string | null;
  text: string;
  reply: string | null;
  reviewed: boolean;
  createdAt: string;
}

export function UnmatchedList({ items, unreviewedOnly }: { items: UnmatchedItem[]; unreviewedOnly: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setReviewed(id: string, reviewed: boolean) {
    setBusy(id);
    const result = await adminPost("/api/admin/unmatched", { id, reviewed });
    setBusy(null);
    if (result.ok) router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <Link
          href="/unmatched"
          className={`rounded-full px-3 py-1 text-sm font-medium ${unreviewedOnly ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
        >
          Unreviewed
        </Link>
        <Link
          href="/unmatched?view=all"
          className={`rounded-full px-3 py-1 text-sm font-medium ${!unreviewedOnly ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
        >
          All
        </Link>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-slate-500">
          {unreviewedOnly ? "Nothing to review — the matcher recognised everything captured so far." : "No captured wording yet."}
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{item.caseId}</span>
              {item.stage && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{item.stage}</span>}
              {item.reviewed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Reviewed</span>}
              <span className="ml-auto text-xs text-slate-400">{formatDateTime(item.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm font-medium text-slate-900">“{item.text}”</p>
            {item.reply && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">Patient replied: {item.reply}</p>}
            <div className="mt-3 flex justify-end">
              <button
                disabled={busy === item.id}
                onClick={() => setReviewed(item.id, !item.reviewed)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {item.reviewed ? "Mark unreviewed" : "Mark reviewed"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
