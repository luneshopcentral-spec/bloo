import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container max-w-3xl pb-20 pt-28">
      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950"><strong>Pre-launch legal review required.</strong> These terms describe the intended service and checkout behavior but must be professionally reviewed before production payments open.</div>
      <h1 className="text-4xl font-bold text-slate-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-600">Last updated: 31 July 2026</p>
      <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
        <section><h2 className="text-xl font-semibold text-slate-900">1. Service and operator</h2><p className="mt-2">{SITE_CONFIG.legalBusinessName} operates DispenseRx Practice, an independent Australian dispensing-workflow training simulator. It is not affiliated with, endorsed by or connected to Fred IT Group Pty Ltd. Fred Dispense is a trademark of Fred IT Group Pty Ltd.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">2. Training limitations</h2><p className="mt-2">The service uses fictional cases for education only. It does not certify competence and does not replace current product information, PBS listings, legislation, university guidance, clinical supervision or professional judgement. Do not use it to make a real patient-care decision.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">3. Accounts and acceptable use</h2><p className="mt-2">Provide accurate account information, protect credentials and notify support of suspected unauthorised access. Do not share accounts, misuse personal information, interfere with the service, bypass access controls, scrape case content or reproduce and redistribute the simulator without permission.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">4. Free access</h2><p className="mt-2">An account can try 2 of 13 cases without a card. Free access does not automatically convert to paid access. The number or content of free cases may change prospectively, but completed purchases will not be altered retrospectively.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">5. Subscriptions, renewals and cancellation</h2><p className="mt-2">Monthly and annual subscriptions are processed by Stripe and renew automatically until cancelled. The selected plan, amount, billing period and applicable tax are shown before payment. Manage payment details or cancel from the account dashboard. Cancellation stops the next renewal and access continues to the end of the paid period unless law requires otherwise. See the <Link href="/refund-policy" className="text-emerald-800 underline">Refund and Cancellation Policy</Link>.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">6. Availability and content changes</h2><p className="mt-2">The beta may change as cases and safeguards are reviewed. No uninterrupted availability or future case-release cadence is promised. Reasonable notice will be given for material paid-access changes where practicable.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">7. Intellectual property</h2><p className="mt-2">Unless stated otherwise, the original case content, scoring logic and interface are owned or licensed by the operator. These terms give you a personal, revocable, non-transferable right to use the service for study.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">8. Consumer guarantees and liability</h2><p className="mt-2">Nothing in these terms excludes rights or remedies that cannot lawfully be excluded, including applicable Australian Consumer Law guarantees. To the extent permitted by law, liability is limited to reasonably foreseeable loss caused by failure to provide the service with required care and skill; the service is not liable for reliance on training content in a real clinical decision.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">9. Suspension and termination</h2><p className="mt-2">Access may be suspended where reasonably necessary to protect users, investigate misuse or comply with law. You may stop using the service and request account deletion through support; billing cancellation is managed separately as described above.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">10. Contact and applicable law</h2><p className="mt-2">Questions and complaints can be sent through <Link href="/support" className="text-emerald-800 underline">support</Link>. These terms are governed by applicable Australian law; the operator&rsquo;s state or territory and dispute venue must be confirmed during legal review.</p></section>
      </div>
    </div>
  );
}
