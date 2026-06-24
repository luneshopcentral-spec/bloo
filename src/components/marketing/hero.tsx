import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, PlayCircle } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20">
      {/* background gradient blob */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-emerald-50 opacity-60 blur-3xl" />
        <div className="absolute top-20 -left-20 h-[400px] w-[400px] rounded-full bg-teal-50 opacity-50 blur-3xl" />
      </div>

      <div className="container text-center">
        <Badge
          variant="outline"
          className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-700"
        >
          Built for Australian pharmacy students
        </Badge>

        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Master{" "}
          <span className="text-emerald-600">Fred Dispense</span>
          <br />
          Before Your Placement
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          Practise real PBS dispensing workflows from home — at your own pace,
          any time of day. Get instant feedback, track your progress, and walk
          into your clinical placement with confidence.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="h-12 px-8 text-base" asChild>
            <Link href="/sign-up">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base"
            asChild
          >
            <a href="#how-it-works">
              <PlayCircle className="mr-2 h-5 w-5 text-emerald-600" />
              See How It Works
            </a>
          </Button>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          3 free cases — no credit card needed
        </p>

        {/* mock app screenshot placeholder */}
        <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-slate-400">
              DispenseRx Practice — Case #12: Metformin 500mg
            </span>
          </div>
          <div className="bg-slate-900 p-8 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3 rounded-lg bg-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Prescription
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-white">Patient: Jane Smith</p>
                  <p className="text-sm text-white">DOB: 14/03/1985</p>
                  <p className="text-sm text-emerald-400">
                    Metformin HCl 500mg tabs
                  </p>
                  <p className="text-sm text-slate-300">
                    Qty: 60 | Repeats: 5
                  </p>
                  <p className="text-sm text-slate-300">
                    Dr. A. Kumar — PBS: 7843B
                  </p>
                </div>
              </div>
              <div className="space-y-3 rounded-lg bg-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Dispensing Fields
                </p>
                <div className="space-y-2">
                  {["Drug name", "Strength", "Quantity", "PBS item code"].map(
                    (field) => (
                      <div
                        key={field}
                        className="flex items-center gap-2 rounded bg-slate-700 px-3 py-1.5"
                      >
                        <span className="text-xs text-slate-400">{field}</span>
                        <div className="h-1.5 flex-1 animate-pulse rounded bg-slate-600" />
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
