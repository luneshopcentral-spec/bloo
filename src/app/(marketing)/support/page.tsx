import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, LifeBuoy, Mail, ShieldAlert } from "lucide-react";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Support",
  description: "Account, billing, privacy and technical support for DispenseRx Practice.",
};

export default function SupportPage() {
  const email = SITE_CONFIG.supportEmail;

  return (
    <div className="container max-w-4xl pb-20 pt-28">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Contact and support</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">How can we help?</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">
        Contact the person operating DispenseRx Practice for account access, billing,
        refunds, privacy requests, data access or deletion, and technical problems.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Mail className="h-7 w-7 text-emerald-700" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Email support</h2>
          {email ? (
            <>
              <p className="mt-2 text-sm leading-6 text-slate-600">Include the email on your account and a short description. Do not send passwords or payment-card details.</p>
              <a className="mt-5 inline-flex rounded-md bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-900" href={`mailto:${email}`}>{email}</a>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              The monitored support inbox has not been configured. Production paid checkout is blocked until <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> is set.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Clock3 className="h-7 w-7 text-emerald-700" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">Beta response target</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The operator monitors support and aims to reply {SITE_CONFIG.supportResponseTime}.
            Billing, account lockout and privacy requests are prioritised.
          </p>
        </section>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl bg-slate-50 p-6">
          <LifeBuoy className="h-6 w-6 text-slate-700" aria-hidden="true" />
          <h2 className="mt-4 font-semibold text-slate-900">Include in your message</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>The page or case where the problem occurred</li>
            <li>What you expected and what happened</li>
            <li>Your browser and device</li>
            <li>A screenshot with patient-like training data only</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <ShieldAlert className="h-6 w-6 text-red-800" aria-hidden="true" />
          <h2 className="mt-4 font-semibold text-red-950">Not for clinical emergencies</h2>
          <p className="mt-3 text-sm leading-6 text-red-950/80">
            This support route cannot give patient-specific clinical advice. For a real clinical or dispensing concern, use your workplace escalation process and current professional resources.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-slate-600">
        Read the <Link href="/privacy" className="font-medium text-emerald-800 underline">Privacy Policy</Link>,{" "}
        <Link href="/terms" className="font-medium text-emerald-800 underline">Terms of Service</Link> or{" "}
        <Link href="/refund-policy" className="font-medium text-emerald-800 underline">Refund and Cancellation Policy</Link>.
      </p>
    </div>
  );
}
