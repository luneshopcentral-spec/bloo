import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Maximize2 } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";

const preview = {
  src: "/product/feedback-results.png",
  alt: "DispenseRx Practice result screen showing a failed critical safety gate and check-by-check dispensing feedback for a fictional patient case.",
  label: "Check-by-check feedback",
  detail: "Safety gates stay visible even when the total score is high.",
} as const;

const trust = [
  `Try 2 of ${STATIC_CASES.length} cases free`,
  "No card required",
  "Instant feedback",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white pb-14 pt-28 sm:pb-20 lg:pt-32">
      {/* Soft light wash under the fixed navbar — no grid, no neon glow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-50 to-transparent"
      />
      <div className="container relative">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Independent Australian training simulator
            </span>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              Practise dispensing{" "}
              <span className="text-emerald-700">before placement.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Work through fictional patient scenarios, make explicit safety
              decisions and review immediate, check-by-check feedback.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="group inline-flex items-center justify-center rounded-full bg-emerald-700 px-7 py-3.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
              >
                Try 2 cases free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                How it works
              </a>
            </div>

            <ul className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
              {trust.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-3xl" aria-label="DispenseRx Practice product preview">
            <figure>
              <a
                href={preview.src}
                target="_blank"
                rel="noreferrer"
                className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
                aria-label={`Enlarge ${preview.label.toLowerCase()} screenshot`}
              >
                <Image
                  src={preview.src}
                  alt={preview.alt}
                  width={1586}
                  height={992}
                  priority
                  sizes="(max-width: 1023px) 100vw, 58vw"
                  className="h-auto w-full transition duration-300 group-hover:scale-[1.01]"
                />
                <span
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-emerald-700 shadow-sm ring-1 ring-slate-200 backdrop-blur transition group-hover:bg-white"
                  aria-hidden="true"
                >
                  <Maximize2 className="h-4 w-4" />
                </span>
              </a>
              <figcaption className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{preview.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {preview.detail} Tap or click to enlarge.
                  </p>
                </div>
                <p className="shrink-0 text-right text-xs text-slate-400">
                  Beta preview · fictional data
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
