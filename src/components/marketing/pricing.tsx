import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, FlaskConical } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { PLAN } from "@/lib/billing/plan";

const FREE_CASE_COUNT = STATIC_CASES.filter((c) => c.isFree).length;

const included = [
  `All ${STATIC_CASES.length} dispensing scenarios — foundation to Schedule 8`,
  "Critical safety-gate scoring",
  "Detailed feedback for every check",
  "Simulated patient counselling with local voice",
  "Repeat-timing and authority-script practice",
  "Laptop-first simulator workspace",
  "Patient, product, label and warning practice",
  "Clinical dispense / hold / do-not-supply decisions",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">Simple pricing</h2>
          <p className="mt-4 text-slate-600">
            Try the first {FREE_CASE_COUNT} cases free — no card required. Unlock the
            complete library with a subscription when you&rsquo;re ready.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* Free demo */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4 pt-8 text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
                Free demo
              </p>
              <div className="mt-2 flex items-end justify-center gap-1">
                <span className="text-5xl font-extrabold text-slate-900">Free</span>
              </div>
              <p className="text-sm text-slate-500">
                {FREE_CASE_COUNT} practice cases · no card
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pb-8">
              <ul className="mb-8 space-y-3">
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span className="text-slate-700">
                    {FREE_CASE_COUNT} full dispensing + counselling cases
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span className="text-slate-700">Full scoring and feedback</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span className="text-slate-700">No payment details needed</span>
                </li>
              </ul>
              <Button variant="outline" className="mt-auto w-full h-12 text-base" asChild>
                <Link href="/sign-up">Start free</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Full access */}
          <Card className="relative flex flex-col overflow-hidden border-2 border-emerald-600 shadow-xl shadow-emerald-100">
            <div className="absolute right-0 top-0 bg-emerald-600 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              Full access
            </div>

            <CardHeader className="pb-4 pt-8 text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-emerald-600">
                {PLAN.name}
              </p>
              <div className="mt-2 flex items-end justify-center gap-1">
                <span className="text-5xl font-extrabold text-slate-900">
                  {PLAN.priceDisplay}
                </span>
                <span className="mb-1 text-slate-500">/{PLAN.interval}</span>
              </div>
              <p className="text-sm text-slate-500">Cancel anytime</p>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col pb-8">
              <ul className="mb-8 space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>

              <Button className="mt-auto w-full h-12 text-base" asChild>
                <Link href="/sign-up">Create account to subscribe</Link>
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5">
                <FlaskConical className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">
                  All {STATIC_CASES.length} cases unlocked
                </p>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                Training tool — not a substitute for current clinical, legal or PBS references.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
