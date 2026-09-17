"use client";

import { usePaidAvailability } from "@/hooks/usePaidAvailability";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, ExternalLink, FlaskConical } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { monthlyEquivalent, planOption, type PlanId } from "@/lib/billing/plan";
import { SITE_CONFIG } from "@/lib/site-config";

const FREE_CASE_COUNT = STATIC_CASES.filter((c) => c.isFree).length;

const included = [
  `All ${STATIC_CASES.length} dispensing and counselling cases`,
  "Critical safety-gate scoring",
  "Detailed check-by-check feedback",
  "Progress history and competency summaries",
  "Subscription management through Stripe",
];

export function Pricing() {
  const paidAvailable = usePaidAvailability();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("monthly");
  const plan = planOption(selectedPlan);
  const taxCopy = SITE_CONFIG.pricesIncludeGst
    ? "Prices include GST."
    : "Any applicable tax is shown before payment.";

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="py-12 sm:py-20">
      <div className="container">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 id="pricing-title" className="text-3xl font-bold text-slate-900">Choose your access</h2>
          <p className="mt-4 text-slate-600">
            Try {FREE_CASE_COUNT} of {STATIC_CASES.length} cases free. No card required.
            Choose a billing period only when you are ready for the full library.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">Free access</p>
            <h3 className="mt-3 text-2xl font-bold text-slate-900">Two-case demo</h3>
            <p className="mt-5 text-4xl font-extrabold text-slate-900">Free</p>
            <p className="mt-2 text-sm text-slate-600">No payment details</p>
            <ul className="my-7 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />Two complete cases</li>
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />Full scoring and feedback</li>
              <li className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />No automatic conversion</li>
            </ul>
            <Link href="/sign-up" className="mt-auto inline-flex h-12 items-center justify-center rounded-md border border-slate-300 font-semibold text-slate-900 transition hover:bg-slate-50">
              Try 2 cases free
            </Link>
          </article>

          <article className="relative flex flex-col rounded-2xl border-2 border-emerald-700 bg-white p-7 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Full access</p>
              <h3 className="mt-3 text-2xl font-bold text-slate-900">{paidAvailable ? "Choose a billing period" : "Full library · coming later"}</h3>
              <div role="group" aria-label="Billing period" className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                {(["monthly", "yearly"] as PlanId[]).map((id) => (
                  <button key={id} type="button" aria-pressed={selectedPlan === id} onClick={() => setSelectedPlan(id)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${selectedPlan === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                    {id === "monthly" ? "Monthly" : "Annual · save"}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-slate-900">{plan.priceDisplay}</span>
                <span className="mb-1 text-slate-600">/{plan.interval}</span>
              </div>
              <p className="mt-2 min-h-5 text-sm text-slate-600">
                {plan.interval === "year" ? `${monthlyEquivalent(plan)}/month equivalent, billed annually` : "Billed each month"}
              </p>
              {plan.badge && <p className="mt-2 text-sm font-semibold text-emerald-800">{plan.badge}</p>}
              <p className="my-7 text-sm leading-6 text-slate-700">Full library access with the same features on both billing periods. Cancel in Stripe; access continues to the period end.</p>
              {paidAvailable ? <Link href={`/sign-up?plan=${plan.id}`} className="mt-auto inline-flex h-12 items-center justify-center rounded-md bg-emerald-800 px-4 font-semibold text-white transition hover:bg-emerald-900">
                Choose {plan.shortName.toLowerCase()}
              </Link> : <p className="mt-auto rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-950">Full access is not open yet. Try the free cases while clinical and launch reviews are completed.</p>}
          </article>
        </div>

        <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
          <h3 className="font-semibold text-emerald-950">Every paid plan includes</h3>
          <ul className="mt-3 grid gap-2 text-sm text-emerald-950/80 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>)}
          </ul>
        </div>

        <div className="mx-auto mt-8 max-w-5xl rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" aria-hidden="true" />
            <p>
              Subscriptions renew automatically until cancelled. Manage payment details or cancel in the Stripe customer portal; cancellation takes effect at the end of the paid billing period. {taxCopy}{" "}
              Accepted payment methods are shown securely by Stripe at checkout. See the <Link className="font-medium text-emerald-800 underline" href="/refund-policy">refund and cancellation policy</Link>.
            </p>
          </div>
          <div className="mt-3 flex items-start gap-3 border-t border-slate-200 pt-3">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
            <p>
              Paid production checkout stays closed until the published clinical, legal and support readiness gates are complete. Annual access covers the current library and does not promise an unannounced case-release cadence.
            </p>
          </div>
          <Link href="/support" className="mt-3 inline-flex items-center gap-1 font-medium text-emerald-800 underline">
            Questions before subscribing <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
