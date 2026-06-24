import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, Infinity } from "lucide-react";

const included = [
  "Full case library (50+ scenarios and growing)",
  "S4 and S8 dispensing cases",
  "Instant feedback with detailed breakdowns",
  "Progress dashboard & accuracy tracking",
  "Mobile-friendly — study anywhere",
  "All future cases added at no extra cost",
  "Lifetime access — pay once, keep forever",
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Simple, one-time pricing
          </h2>
          <p className="mt-4 text-slate-600">
            No subscriptions. No monthly fees. Pay once and study for as long as
            you need.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <Card className="relative overflow-hidden border-2 border-emerald-600 shadow-xl shadow-emerald-100">
            {/* popular ribbon */}
            <div className="absolute right-0 top-0 bg-emerald-600 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white">
              Best value
            </div>

            <CardHeader className="pb-4 pt-8 text-center">
              <p className="text-sm font-medium uppercase tracking-wider text-emerald-600">
                Lifetime Access
              </p>
              <div className="mt-2 flex items-end justify-center gap-1">
                <span className="text-5xl font-extrabold text-slate-900">
                  $39
                </span>
                <span className="mb-2 text-slate-500">AUD</span>
              </div>
              <p className="text-sm text-slate-500">One-time payment</p>
            </CardHeader>

            <CardContent className="pb-8">
              <ul className="mb-8 space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full h-12 text-base" asChild>
                <Link href="/sign-up">Get Lifetime Access — $39 AUD</Link>
              </Button>

              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5">
                <Infinity className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">
                  3 free cases — no card needed to start
                </p>
              </div>

              <p className="mt-4 text-center text-xs text-slate-400">
                30-day money-back guarantee if you are not satisfied.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
