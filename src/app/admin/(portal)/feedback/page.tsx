import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackList, type FeedbackItem } from "@/components/admin/FeedbackList";

export const dynamic = "force-dynamic";

const STATUSES = ["open", "in_progress", "resolved"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = (STATUSES as readonly string[]).includes(status ?? "") ? (status as Status) : null;
  const admin = createAdminClient();

  let query = admin.from("feedback").select("*").order("created_at", { ascending: false }).limit(300);
  if (filter) query = query.eq("status", filter);
  const { data: reports, error } = await query;

  // Resolve reporter emails in one lookup.
  const userIds = [...new Set((reports ?? []).map((r) => r.user_id))];
  const emails = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await admin.from("profiles").select("id, email").in("id", userIds);
    for (const p of profiles ?? []) emails.set(p.id, p.email);
  }

  const items: FeedbackItem[] = (reports ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    caseId: r.case_id,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
    email: emails.get(r.user_id) ?? r.user_id,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feedback</h1>
        <p className="mt-1 text-sm text-slate-500">User-reported content issues, bugs and requests.</p>
      </div>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Feedback table unavailable — has migration 0016/0018 been applied?
        </p>
      ) : (
        <FeedbackList items={items} activeFilter={filter} />
      )}
    </div>
  );
}
