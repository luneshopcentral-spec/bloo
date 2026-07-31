import type { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/site-config";

export const metadata: Metadata = { title: "Refund and Cancellation Policy" };

export default function RefundPolicyPage() {
  return (
    <div className="container max-w-3xl pb-20 pt-28">
      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950"><strong>Pre-launch legal review required.</strong> This policy must be professionally reviewed before production payments open.</div>
      <h1 className="text-4xl font-bold text-slate-900">Refund and Cancellation Policy</h1>
      <p className="mt-2 text-sm text-slate-600">Last updated: 31 July 2026</p>
      <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
        <section><h2 className="text-xl font-semibold text-slate-900">Try before paying</h2><p className="mt-2">Try 2 of 13 cases free with no card required before choosing a subscription.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">Automatic renewal</h2><p className="mt-2">Monthly and annual subscriptions renew automatically through Stripe at the price and interval shown at checkout until cancelled. {SITE_CONFIG.pricesIncludeGst ? "Displayed prices include GST." : "Any applicable tax is shown before payment."}</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">How cancellation works</h2><p className="mt-2">Open the account dashboard, choose Manage subscription and cancel in the Stripe customer portal. Cancellation stops future renewals. Full access normally continues until the end of the billing period already paid for; cancelling does not by itself create a prorated refund.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">Refunds and payment errors</h2><p className="mt-2">Contact <Link href="/support" className="text-emerald-800 underline">support</Link> as soon as reasonably possible if you were charged incorrectly, paid more than once, could not access the paid service, or believe the service was not provided with required care and skill. Include the account email, charge date and reason, but never send full card details. Requests are assessed promptly and refunds are provided where required by Australian Consumer Law or otherwise approved by the operator.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">Failed and past-due payments</h2><p className="mt-2">Stripe may retry a failed renewal and notify you to update the payment method. Full access is paused when the subscription is not active or trialling and can be restored after Stripe confirms successful payment.</p></section>
        <section><h2 className="text-xl font-semibold text-slate-900">Processing time</h2><p className="mt-2">Approved refunds are returned through Stripe to the original payment method. Bank processing time is outside the operator&rsquo;s control. Support aims to reply {SITE_CONFIG.supportResponseTime}.</p></section>
      </div>
    </div>
  );
}
