import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/admin/format";
export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const page = Math.min(
    100000,
    Math.max(1, Number.parseInt((await searchParams).page ?? "1") || 1),
  );
  const { data, error, count } = await createAdminClient()
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 50, page * 50 - 1);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin activity</h1>
        <p className="mt-1 text-sm text-slate-600">
          Who changed access, codes and platform settings. Times are shown in
          Sydney time.
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          The audit log could not be loaded. Check database readiness and try
          again.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-4">When</th>
                  <th className="p-4">Operator</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target / details</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-4 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="p-4">
                      {row.actor_email ?? "Deleted operator"}
                    </td>
                    <td className="p-4 font-mono text-xs">{row.action}</td>
                    <td className="p-4">
                      {row.target_type === "profile" && row.target_id ? (
                        <Link
                          href={`/users/${row.target_id}`}
                          className="text-blue-700 underline"
                        >
                          View account
                        </Link>
                      ) : row.target_type === "access_code" && row.target_id ? (
                        <Link
                          href={`/codes/${encodeURIComponent(row.target_id)}`}
                          className="text-blue-700 underline"
                        >
                          {row.target_id}
                        </Link>
                      ) : (
                        (row.target_id ?? "Platform")
                      )}
                      {row.detail && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-slate-600">
                            Change details
                          </summary>
                          <pre className="mt-2 max-w-lg whitespace-pre-wrap break-words text-xs">
                            {JSON.stringify(row.detail, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
                {!data?.length && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-600">
                      No admin actions have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <nav aria-label="Audit pages" className="flex gap-4 text-sm">
            {page > 1 && (
              <Link className="underline" href={`/audit?page=${page - 1}`}>
                Previous
              </Link>
            )}
            <span>
              Page {page} · {count ?? 0} events
            </span>
            {page * 50 < (count ?? 0) && (
              <Link className="underline" href={`/audit?page=${page + 1}`}>
                Next
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
