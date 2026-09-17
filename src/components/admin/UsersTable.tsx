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
  quizAttempts: number;
  passRate: number | null;
  lastActive: string | null;
}

function accessLabel(row: AdminUserRow): { text: string; tone: string } {
  if (row.role === "admin")
    return { text: "Admin", tone: "bg-slate-900 text-white" };
  if (row.hasPaid)
    return {
      text: row.plan ? `Paid · ${row.plan}` : "Paid",
      tone: "bg-emerald-100 text-emerald-800",
    };
  if (isFuture(row.compAccessUntil))
    return { text: "Trial", tone: "bg-blue-100 text-blue-800" };
  return { text: "Free", tone: "bg-slate-100 text-slate-600" };
}

export function UsersTable({
  rows,
  initialQuery,
  accessFilter,
}: {
  rows: AdminUserRow[];
  initialQuery: string;
  accessFilter: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [access, setAccess] = useState(accessFilter);

  function search(event: React.FormEvent) {
    event.preventDefault();
    router.push(`/users?${new URLSearchParams({ q: query.trim(), access })}`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <Input
          aria-label="Search email or name"
          maxLength={120}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search email or name…"
          className="max-w-xs bg-white"
        />
        <select
          aria-label="Filter by access"
          className="rounded-md border bg-white px-3 text-sm"
          value={access}
          onChange={(e) => setAccess(e.target.value)}
        >
          <option value="all">All access</option>
          <option value="paid">Paid</option>
          <option value="trial">Active trial</option>
          <option value="free">Free</option>
          <option value="admin">Administrators</option>
        </select>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {(initialQuery || accessFilter !== "all") && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setQuery("");
              setAccess("all");
              router.push("/users");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3 text-right">Verified practice</th>
              <th className="px-4 py-3 text-right">Pass rate</th>
              <th className="px-4 py-3">Last learning activity</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badge = accessLabel(row);
              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/users/${row.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {row.fullName || row.email}
                    </Link>
                    <div className="text-xs text-slate-600">{row.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.tone}`}
                    >
                      {badge.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.attempts}
                    <div className="text-xs text-slate-600">
                      {row.quizAttempts} quizzes
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.passRate === null ? "—" : `${row.passRate}%`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.lastActive ? formatDate(row.lastActive) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(row.createdAt)}
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
                  No users match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
