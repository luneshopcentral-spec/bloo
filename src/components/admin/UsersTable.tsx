"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, isFuture } from "@/lib/admin/format";

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  university: string | null;
  role: string;
  hasPaid: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
  compAccessUntil: string | null;
  createdAt: string;
  attempts: number;
  passRate: number | null;
  lastActive: string | null;
}

function accessLabel(row: AdminUserRow): { text: string; tone: string } {
  if (row.role === "admin") return { text: "Admin", tone: "bg-slate-900 text-white" };
  if (row.hasPaid) return { text: row.plan ? `Paid · ${row.plan}` : "Paid", tone: "bg-emerald-100 text-emerald-800" };
  if (isFuture(row.compAccessUntil)) return { text: "Trial", tone: "bg-blue-100 text-blue-800" };
  return { text: "Free", tone: "bg-slate-100 text-slate-600" };
}

export function UsersTable({ rows, initialQuery }: { rows: AdminUserRow[]; initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function search(event: React.FormEvent) {
    event.preventDefault();
    router.push(query.trim() ? `/users?q=${encodeURIComponent(query.trim())}` : "/users");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search email or name…"
          className="max-w-xs bg-white"
        />
        <Button type="submit" variant="outline">Search</Button>
        {initialQuery && (
          <Button type="button" variant="ghost" onClick={() => { setQuery(""); router.push("/users"); }}>
            Clear
          </Button>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3 text-right">Attempts</th>
              <th className="px-4 py-3 text-right">Pass rate</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badge = accessLabel(row);
              return (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/users/${row.id}`} className="font-medium text-slate-900 hover:underline">
                      {row.fullName || "—"}
                    </Link>
                    <div className="text-xs text-slate-500">{row.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.tone}`}>
                      {badge.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.attempts}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.passRate === null ? "—" : `${row.passRate}%`}</td>
                  <td className="px-4 py-3 text-slate-500">{row.lastActive ? formatDate(row.lastActive) : "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users match that search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
