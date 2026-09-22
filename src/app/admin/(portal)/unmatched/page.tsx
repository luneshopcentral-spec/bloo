import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { UnmatchedList, type UnmatchedItem } from "@/components/admin/UnmatchedList";

export const dynamic = "force-dynamic";

export default async function AdminUnmatchedPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireAdmin();
  const { view } = await searchParams;
  const unreviewedOnly = view !== "all";
  const admin = createAdminClient();

  let query = admin
    .from("unmatched_utterances")
    .select("id, case_id, stage, text, patient_reply, reviewed, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (unreviewedOnly) query = query.eq("reviewed", false);
  const { data, error } = await query;

  const items: UnmatchedItem[] = (data ?? []).map((row) => ({
    id: row.id,
    caseId: row.case_id,
    stage: row.stage,
    text: row.text,
    reply: row.patient_reply,
    reviewed: row.reviewed,
    createdAt: row.created_at,
  }));

  // Per-case miss counts (within the current view) to show where wording gaps concentrate.
  const byCase = new Map<string, number>();
  for (const item of items) byCase.set(item.caseId, (byCase.get(item.caseId) ?? 0) + 1);
  const caseCounts = [...byCase.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Unrecognised wording</h1>
        <p className="mt-1 text-sm text-slate-600">
          Student counselling phrases the deterministic matcher did not recognise. Use these to add topic
          patterns and regression tests, then mark them reviewed.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Capture table unavailable — has migration 0020 been applied?
        </p>
      ) : (
        <>
          {caseCounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {caseCounts.map(([caseId, count]) => (
                <span key={caseId} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {caseId} · {count}
                </span>
              ))}
            </div>
          )}
          <UnmatchedList items={items} unreviewedOnly={unreviewedOnly} />
        </>
      )}
    </div>
  );
}
