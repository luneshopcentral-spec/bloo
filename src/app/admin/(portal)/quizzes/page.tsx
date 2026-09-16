import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSULTATION_QUIZ_CASES } from "@/lib/quiz/cases";
import { QUIZ_CONTENT_VERSION } from "@/lib/quiz/version";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: attempts } = await admin.from("quiz_attempts").select("case_id, percentage").limit(20000);

  const stats = new Map<string, { total: number; sum: number }>();
  for (const row of attempts ?? []) {
    const entry = stats.get(row.case_id) ?? { total: 0, sum: 0 };
    entry.total += 1;
    entry.sum += row.percentage;
    stats.set(row.case_id, entry);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quizzes</h1>
        <p className="mt-1 text-sm text-slate-500">
          {CONSULTATION_QUIZ_CASES.length} consultation quiz cases · content version <code className="rounded bg-slate-100 px-1">{QUIZ_CONTENT_VERSION}</code>
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Editing:</strong> quiz content is version-controlled in code today. In-portal editing lands in Phase 2
        alongside the case content store. This viewer is read-only.
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Quiz</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3 text-right">Questions</th>
              <th className="px-4 py-3 text-right">Attempts</th>
              <th className="px-4 py-3 text-right">Avg score</th>
            </tr>
          </thead>
          <tbody>
            {CONSULTATION_QUIZ_CASES.map((q) => {
              const s = stats.get(q.id);
              const avg = s && s.total > 0 ? Math.round(s.sum / s.total) : null;
              return (
                <tr key={q.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{q.title}</div>
                    <div className="text-xs text-slate-500">{q.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{q.difficulty}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{q.questions.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s?.total ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{avg === null ? "—" : `${avg}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
