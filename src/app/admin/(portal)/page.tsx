import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { CONSULTATION_QUIZ_CASES } from "@/lib/quiz/cases";
import { StatCard } from "@/components/admin/StatCard";

export const dynamic = "force-dynamic";

async function count(build: () => PromiseLike<{ count: number | null }>): Promise<number> {
  try {
    const { count: value } = await build();
    return value ?? 0;
  } catch {
    return 0;
  }
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [users, paid, comp, attempts, attempts7d, openFeedback, activeAnnouncements, activeCodes] =
    await Promise.all([
      count(() => admin.from("profiles").select("*", { count: "exact", head: true })),
      count(() => admin.from("profiles").select("*", { count: "exact", head: true }).eq("has_paid", true)),
      count(() => admin.from("profiles").select("*", { count: "exact", head: true }).gt("comp_access_until", nowIso)),
      count(() => admin.from("attempts").select("*", { count: "exact", head: true })),
      count(() => admin.from("attempts").select("*", { count: "exact", head: true }).gte("created_at", weekAgoIso)),
      count(() => admin.from("feedback").select("*", { count: "exact", head: true }).neq("status", "resolved")),
      count(() => admin.from("announcements").select("*", { count: "exact", head: true }).eq("active", true)),
      count(() => admin.from("access_codes").select("*", { count: "exact", head: true }).eq("active", true)),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Live operational snapshot of the platform.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={users} />
        <StatCard label="Paying subscribers" value={paid} />
        <StatCard label="Trial / comp active" value={comp} hint="Live access-code or manual grants" />
        <StatCard label="Open feedback" value={openFeedback} hint="Not yet resolved" />
        <StatCard label="Attempts (all time)" value={attempts} />
        <StatCard label="Attempts (7 days)" value={attempts7d} />
        <StatCard label="Cases" value={STATIC_CASES.length} hint="Authored simulator cases" />
        <StatCard label="Quizzes" value={CONSULTATION_QUIZ_CASES.length} hint="Consultation quiz cases" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/users" title="Users" body="Search, inspect and manage accounts." />
        <QuickLink href="/feedback" title="Feedback" body={`${openFeedback} open · triage and resolve.`} />
        <QuickLink href="/codes" title="Access codes" body={`${activeCodes} active · issue free-trial access.`} />
        <QuickLink href="/announcements" title="Announcements" body={`${activeAnnouncements} live · post a banner.`} />
      </section>
    </div>
  );
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </Link>
  );
}
