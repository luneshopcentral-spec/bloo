import Link from "next/link";
import { z } from "zod";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserActions } from "@/components/admin/UserActions";
import { formatDate, formatDateTime, isFuture } from "@/lib/admin/format";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireAdmin();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin.from("profiles").select("*").eq("id", id).single();
  if (profileError && profileError.code !== "PGRST116") return <p role="alert">Could not load the account. Please try again.</p>;
  if (!profile) notFound();
  const { data: authData } = await admin.auth.admin.getUserById(id);

  const [{ data: attempts }, { data: quizzes }, { data: redemptions }] = await Promise.all([
    admin.from("attempts").select("case_id, passed, score, max_score, mode, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    admin.from("quiz_attempts").select("case_id, percentage, mode, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    admin.from("access_code_redemptions").select("code, granted_until, redeemed_at").eq("user_id", id).order("redeemed_at", { ascending: false }),
  ]);

  const totalAttempts = attempts?.length ?? 0;
  const passed = (attempts ?? []).filter((a) => a.passed).length;

  return (
    <div className="space-y-6">
      <Link href="/users" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">{profile.full_name || "—"}</h1>
        <p className="text-sm text-slate-600">{profile.email}</p>
        <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <Field label="Role" value={profile.role} />
          <Field label="University" value={profile.university ?? "—"} />
          <Field label="Paid" value={profile.has_paid ? "Yes" : "No"} />
          <Field label="Plan" value={profile.subscription_plan ?? "—"} />
          <Field label="Subscription status" value={profile.subscription_status ?? "—"} />
          <Field label="Renews / ends" value={formatDate(profile.subscription_current_period_end)} />
          <Field
            label="Trial / comp access"
            value={isFuture(profile.comp_access_until) ? `Active until ${formatDateTime(profile.comp_access_until)}` : "None"}
          />
          <Field label="Joined" value={formatDateTime(profile.created_at)} />
          <Field label="Email confirmed" value={formatDateTime(authData.user?.email_confirmed_at)} />
          <Field label="Last sign-in" value={formatDateTime(authData.user?.last_sign_in_at)} />
        </dl>
      </div>

      <UserActions
        userId={profile.id}
        role={profile.role}
        compActive={isFuture(profile.comp_access_until)}
        isSelf={profile.id === actor.id}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityCard title={`Latest 20 practice attempts (${passed}/${totalAttempts} passed)`}>
          {(attempts ?? []).map((a, i) => (
            <Row key={i} left={a.case_id} mid={`${a.score}/${a.max_score} · ${a.mode}`} right={formatDate(a.created_at)} ok={a.passed} />
          ))}
          {totalAttempts === 0 && <Empty />}
        </ActivityCard>

        <ActivityCard title={`Latest 20 quiz attempts (${quizzes?.length ?? 0})`}>
          {(quizzes ?? []).map((q, i) => (
            <Row key={i} left={q.case_id} mid={q.mode} right={formatDate(q.created_at)} ok={q.percentage >= 80} tag={`${q.percentage}%`} />
          ))}
          {(quizzes?.length ?? 0) === 0 && <Empty />}
        </ActivityCard>
      </div>

      {(redemptions?.length ?? 0) > 0 && (
        <ActivityCard title="Access-code redemptions">
          {(redemptions ?? []).map((r, i) => (
            <Row key={i} left={r.code} mid={`granted until ${formatDateTime(r.granted_until)}`} right={formatDateTime(r.redeemed_at)} />
          ))}
        </ActivityCard>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ActivityCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-medium">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ left, mid, right, ok, tag }: { left: string; mid: string; right: string; ok?: boolean; tag?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-sm last:border-0">
      <span className="flex items-center gap-2">
        {ok !== undefined && <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-400"}`} />}
        <span className="font-medium">{left}</span>
        {tag && <span className="text-xs text-slate-600">{tag}</span>}
      </span>
      <span className="text-xs text-slate-600">{mid}</span>
      <span className="text-xs text-slate-600">{right}</span>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-slate-600">No activity yet.</p>;
}
