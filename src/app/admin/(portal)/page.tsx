import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { CONSULTATION_QUIZ_CASES } from "@/lib/quiz/cases";
import { StatCard } from "@/components/admin/StatCard";

export const dynamic = "force-dynamic";

async function count(build: () => PromiseLike<{ count: number | null; error?: unknown }>): Promise<number | null> {
  try {
    const { count: value, error } = await build();
    return error ? null : value;
  } catch {
    return null;
  }
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [users, paid, comp, attempts, attempts7d, openFeedback, activeAnnouncements, activeCodes, newUsers, unmatched] =
    await Promise.all([
      count(() => admin.from("profiles").select("*", { count: "exact", head: true })),
      count(() => admin.from("profiles").select("*", { count: "exact", head: true }).eq("has_paid", true)),
      count(() => admin.from("profiles").select("*", { count: "exact", head: true }).gt("comp_access_until", nowIso)),
      count(() => admin.from("attempts").select("*", { count: "exact", head: true })),
      count(() => admin.from("attempts").select("*", { count: "exact", head: true }).gte("created_at", weekAgoIso)),
      count(() => admin.from("feedback").select("*", { count: "exact", head: true }).neq("status", "resolved")),
      count(() => admin.from("announcements").select("*", { count: "exact", head: true }).eq("active", true).lte("starts_at",nowIso).or(`ends_at.is.null,ends_at.gt.${nowIso}`)),
      count(() => admin.from("access_codes").select("*", { count: "exact", head: true }).eq("active", true)),
      count(() => admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgoIso)),
      count(() => admin.from("unmatched_utterances").select("*", { count: "exact", head: true }).eq("reviewed", false)),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-slate-600">Live operational snapshot of the platform.</p>
      </div>

      {[users,paid,comp,attempts,openFeedback,activeCodes,newUsers].some(value=>value===null) && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Some reporting data could not be loaded. Counts marked unavailable are not zero. Check database migrations and connectivity.</p>}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={users ?? "Unavailable"} />
        <StatCard label="Paying subscribers" value={paid ?? "Unavailable"} />
        <StatCard label="Trial / comp active" value={comp ?? "Unavailable"} hint="Live access-code or manual grants" />
        <StatCard label="Open feedback" value={openFeedback ?? "Unavailable"} hint="Not yet resolved" />
        <StatCard label="Attempts (all time)" value={attempts ?? "Unavailable"} />
        <StatCard label="Attempts (7 days)" value={attempts7d ?? "Unavailable"} />
        <StatCard label="New registrations (7 days)" value={newUsers ?? "Unavailable"} hint={`${STATIC_CASES.length} authored simulator cases`} />
        <StatCard label="Quizzes" value={CONSULTATION_QUIZ_CASES.length} hint="Consultation quiz cases" />
        <StatCard label="Unrecognised wording" value={unmatched ?? "Unavailable"} hint="Unreviewed capture — grow patterns" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/users" title="Users" body="Search, inspect and manage accounts." />
        <QuickLink href="/feedback" title="Feedback" body={`${openFeedback ?? "Unavailable"} open · triage and resolve.`} />
        <QuickLink href="/codes" title="Access codes" body={`${activeCodes ?? "Unavailable"} enabled · issue free-trial access.`} />
        <QuickLink href="/announcements" title="Announcements" body={`${activeAnnouncements ?? "Unavailable"} live · post a banner.`} />
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
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </Link>
  );
}
