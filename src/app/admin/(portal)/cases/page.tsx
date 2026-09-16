import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { CASE_EDITORIAL_RECORDS } from "@/lib/governance/editorial";

export const dynamic = "force-dynamic";

export default async function AdminCasesPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: attempts } = await admin.from("attempts").select("case_id, passed").limit(20000);

  const stats = new Map<string, { total: number; passed: number }>();
  for (const row of attempts ?? []) {
    const entry = stats.get(row.case_id) ?? { total: 0, passed: 0 };
    entry.total += 1;
    if (row.passed) entry.passed += 1;
    stats.set(row.case_id, entry);
  }
  const editorial = new Map(CASE_EDITORIAL_RECORDS.map((r) => [r.caseId, r]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cases</h1>
        <p className="mt-1 text-sm text-slate-500">{STATIC_CASES.length} authored simulator cases, with live attempt analytics.</p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Editing:</strong> case content is version-controlled in code today. In-portal editing lands in Phase 2
        (a database-backed content store the simulator reads at runtime). This viewer is read-only.
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Editorial</th>
              <th className="px-4 py-3 text-right">Attempts</th>
              <th className="px-4 py-3 text-right">Pass rate</th>
            </tr>
          </thead>
          <tbody>
            {STATIC_CASES.map((c) => {
              const s = stats.get(c.id);
              const record = editorial.get(c.id);
              const rate = s && s.total > 0 ? Math.round((s.passed / s.total) * 100) : null;
              return (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-slate-500">{c.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    {c.isFree ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Free</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Paid</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {record ? (
                      <>
                        <div>{record.version}</div>
                        <div className="text-slate-400">clinical: {record.clinicalReview.status} · legal: {record.legalReview.status}</div>
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s?.total ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{rate === null ? "—" : `${rate}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
