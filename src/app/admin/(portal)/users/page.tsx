import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";
export const dynamic = "force-dynamic";
type Report = {
  total: number;
  rows: Array<{
    id: string;
    email: string;
    full_name: string;
    university: string | null;
    role: string;
    has_paid: boolean;
    subscription_plan: string | null;
    subscription_status: string | null;
    comp_access_until: string | null;
    created_at: string;
    attempts: number;
    passed: number;
    last_practice: string | null;
    quiz_attempts: number;
    last_quiz: string | null;
  }>;
};
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; access?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 120);
  const page = Math.min(
    100000,
    Math.max(1, Number.parseInt(params.page ?? "1") || 1),
  );
  const access = ["all", "paid", "trial", "free", "admin"].includes(
    params.access ?? "",
  )
    ? params.access!
    : "all";
  const { data, error } = await createAdminClient().rpc("admin_list_users", {
    search_term: q,
    page_offset: (page - 1) * 50,
    page_size: 50,
    access_filter: access,
  });
  const report = data as unknown as Report | null;
  const rows: AdminUserRow[] = (report?.rows ?? []).map((p) => ({
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
    attempts: p.attempts,
    passRate: p.attempts ? Math.round((p.passed / p.attempts) * 100) : null,
    lastActive:
      [p.last_practice, p.last_quiz].filter(Boolean).sort().at(-1) ?? null,
    quizAttempts: p.quiz_attempts,
  }));
  const link = (n: number) =>
    `/users?${new URLSearchParams({ q, access, page: String(n) })}`;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Registered users</h1>
        <p className="mt-1 text-sm text-slate-600">
          {error
            ? "User reporting is currently unavailable."
            : `${report?.total ?? 0} matching accounts · 50 per page`}
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          Could not load users. Check database readiness and try again.
        </p>
      ) : (
        <>
          <UsersTable rows={rows} initialQuery={q} accessFilter={access} />
          <p className="text-xs text-slate-600">
            Practice counts and pass rates include all verified, independent
            attempts. Last learning activity includes practice and quizzes, not
            sign-ins.
          </p>
          <nav
            aria-label="User pages"
            className="flex items-center gap-4 text-sm"
          >
            {page > 1 && (
              <Link href={link(page - 1)} className="underline">
                Previous
              </Link>
            )}
            <span>Page {page}</span>
            {page * 50 < (report?.total ?? 0) && (
              <Link href={link(page + 1)} className="underline">
                Next
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
