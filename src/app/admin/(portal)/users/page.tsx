import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, email, full_name, university, has_paid, role, subscription_plan, subscription_status, comp_access_until, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.or(`email.ilike.${term},full_name.ilike.${term}`);
  }
  const { data: profiles } = await query;

  // Aggregate activity in one pass. At launch scale a few thousand attempt rows
  // is cheap; revisit with a materialised view if this grows large.
  const { data: attempts } = await admin
    .from("attempts")
    .select("user_id, passed, created_at")
    .order("created_at", { ascending: false })
    .limit(8000);

  const activity = new Map<string, { total: number; passed: number; last: string | null }>();
  for (const row of attempts ?? []) {
    const entry = activity.get(row.user_id) ?? { total: 0, passed: 0, last: null };
    entry.total += 1;
    if (row.passed) entry.passed += 1;
    if (!entry.last || row.created_at > entry.last) entry.last = row.created_at;
    activity.set(row.user_id, entry);
  }

  const rows: AdminUserRow[] = (profiles ?? []).map((p) => {
    const stats = activity.get(p.id);
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      university: p.university,
      role: p.role,
      hasPaid: p.has_paid,
      plan: p.subscription_plan,
      subscriptionStatus: p.subscription_status,
      compAccessUntil: p.comp_access_until,
      createdAt: p.created_at,
      attempts: stats?.total ?? 0,
      passRate: stats && stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : null,
      lastActive: stats?.last ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-slate-500">{rows.length} accounts (most recent first).</p>
      </div>
      <UsersTable rows={rows} initialQuery={q ?? ""} />
    </div>
  );
}
