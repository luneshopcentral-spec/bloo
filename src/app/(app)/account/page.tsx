import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountSettings, FeedbackForm } from "@/components/app/account-settings";

export const metadata = { title: "Account and support" };
export default async function AccountPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile } = await client.from("profiles").select("*").eq("id", user.id).single();
  return <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
    <header><Link href="/dashboard" className="text-sm text-emerald-800 underline">Back to dashboard</Link><h1 className="mt-3 text-3xl font-bold">Account and support</h1><p className="mt-2 break-all text-slate-600">{user.email}</p></header>
    <section className="rounded-xl border bg-white p-6"><h2 className="mb-5 text-xl font-semibold">Your profile</h2><AccountSettings userId={user.id} name={profile?.full_name ?? ""} university={profile?.university ?? ""} /></section>
    <section className="rounded-xl border bg-white p-6"><h2 className="mb-3 text-xl font-semibold">Billing and data</h2>
      {profile?.stripe_customer_id && <form action="/api/billing-portal" method="post"><button className="mb-4 rounded-lg border px-4 py-2">Manage billing or cancel subscription</button></form>}
      <p className="mb-4"><Link href="/forgot-password" className="text-emerald-800 underline">Reset your password</Link></p>
      <a href="/api/account/export" className="font-medium text-emerald-800 underline">Download your account and progress data</a>
      <p className="mt-3 text-sm text-slate-600">For deletion, submit a privacy request below. Cancel an active subscription through billing first. Local practice drafts and queued submissions are stored on this browser.</p>
    </section>
    <section id="report" className="rounded-xl border bg-white p-6"><h2 className="mb-5 text-xl font-semibold">Report a problem or request help</h2><FeedbackForm /></section>
  </div>;
}
