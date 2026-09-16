import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl pb-20 pt-28">
      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
        <strong>Pre-launch legal review required.</strong> This policy describes the implemented data flow, but must be professionally reviewed before production payments open.
      </div>
      <h1 className="text-4xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-600">Last updated: 15 September 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
        <section><h2 className="text-xl font-semibold text-slate-900">1. Who is responsible</h2><p className="mt-2">{SITE_CONFIG.legalBusinessName} operates DispenseRx Practice. Privacy questions, complaints, access, correction and deletion requests can be sent through the <Link href="/support" className="text-emerald-800 underline">support route</Link>.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">2. Information collected</h2><ul className="mt-2 list-disc space-y-2 pl-5"><li>Account information: name, email, and optional university/training provider and study stage.</li><li>Practice information: case attempts, answers, scores, critical failures, competencies and progress history.</li><li>Subscription information: Stripe customer/subscription IDs, selected plan, subscription status and billing-period dates. Card details are handled by Stripe and are not stored by DispenseRx Practice.</li><li>Security and operational information needed to authenticate users, diagnose errors and protect the service.</li></ul></section>
        <section><h2 className="text-xl font-semibold text-slate-900">3. Why it is used</h2><p className="mt-2">Information is used to create and secure accounts, save progress, provide and manage access, process subscriptions, respond to support and privacy requests, prevent abuse, diagnose faults and improve the training experience. Optional study details help tailor and evaluate the beta; they are not required to create an account.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">4. Storage, disclosure and overseas processing</h2><p className="mt-2">Supabase provides authentication and database hosting, and Stripe provides checkout, billing and subscription management. These providers may process or store information outside Australia under their own data-processing and privacy terms. Information may also be disclosed where required by law or to protect users and the service. Personal information is not sold.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">5. Retention and deletion</h2><p className="mt-2">Account and practice information is retained while an account is active and only as long as reasonably needed for the purposes above. Some billing, security or complaint records may be retained where legally required. Ask support to delete an account; identity may be verified before the request is completed.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">6. Access, correction and complaints</h2><p className="mt-2">You may request access to or correction of personal information, ask how it has been used, request deletion, or make a complaint through support. The operator will acknowledge and investigate privacy complaints and aims to respond {SITE_CONFIG.supportResponseTime}. If a complaint cannot be resolved, you may contact the Office of the Australian Information Commissioner.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">7. Cookies and tracking</h2><p className="mt-2">Essential cookies support authentication. Account-scoped local browser storage keeps simulator drafts, quiz progress and submissions waiting to save. These copies remain on the device until cleared. Completed consultation text is stored with your attempt. Optional microphone recognition may send audio to your browser provider; check its privacy terms. Text input remains available. No third-party advertising tracker is currently used. If analytics are introduced, this policy will be updated before collection begins.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">8. Security and changes</h2><p className="mt-2">Reasonable technical and organisational safeguards are used, but no online service can promise absolute security. Material policy changes will be dated here and, where appropriate, communicated through the account email.</p></section>
      </div>
    </div>
  );
}
