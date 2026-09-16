import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CASE_EDITORIAL_RECORDS } from "@/lib/governance/editorial";
export const metadata = { title: "Launch and support review" };
export default async function AdminPage() {
  const client = await createClient(); const { data: { user } } = await client.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") notFound();
  const { data: reports, error } = await createAdminClient().from("feedback").select("*").order("created_at", { ascending: false }).limit(100);
  return <div className="mx-auto max-w-5xl space-y-8 px-4 py-10"><h1 className="text-3xl font-bold">Launch and support review</h1>
    <section><h2 className="mb-4 text-xl font-semibold">Editorial sign-off register</h2><p className="mb-4 text-sm text-slate-600">Approvals must be entered in the version-controlled editorial register with reviewer identity, date and reviewed source versions. This page does not grant clinical approval.</p><div className="grid gap-3 sm:grid-cols-2">{CASE_EDITORIAL_RECORDS.map((record) => <article key={record.caseId} className="rounded-lg border bg-white p-4"><h3 className="font-semibold">{record.caseId} · {record.version}</h3><p className="text-sm">Clinical: {record.clinicalReview.status} · Jurisdiction: {record.legalReview.status}</p><p className="text-sm">{record.jurisdiction}</p></article>)}</div></section>
    <section><h2 className="mb-4 text-xl font-semibold">Latest 100 support reports</h2>{error && <p>Reports unavailable. Check the database migration.</p>}{reports?.length === 0 && <p>No reports yet.</p>}{reports?.map((report) => <article key={report.id} className="mb-3 rounded-lg border bg-white p-4"><h3 className="font-semibold">{report.kind} · {report.case_id ?? "General"} · {report.status}</h3><p className="text-xs text-slate-600">{report.created_at} · account {report.user_id}</p><p className="mt-3 whitespace-pre-wrap break-words">{report.message}</p></article>)}</section>
  </div>;
}
