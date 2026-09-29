import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { HeroDemo } from "./hero-demo";

const FREE_CASES = STATIC_CASES.filter((c) => c.isFree).length;

export function Hero() {
  return (
    <section className="bg-white pb-14 pt-28 sm:pb-20 lg:pt-32">
      <div className="container">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
              Independent Australian training simulator
            </p>

            <h1 className="mt-5 text-balance text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-[3.25rem]">
              Practise dispensing{" "}
              <span className="text-emerald-700">before placement.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Enter realistic Australian prescriptions in a full dispensing workflow, assemble the pack, counsel a
              simulated patient, then see exactly which safety checks you passed.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/sign-up"
                className="group inline-flex items-center rounded-full bg-slate-950 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slate-800"
              >
                Try {FREE_CASES} cases free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="text-[15px] font-semibold text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {FREE_CASES} of {STATIC_CASES.length} cases free · No card required
            </p>
          </div>

          <HeroDemo />
        </div>
      </div>
    </section>
  );
}
