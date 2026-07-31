import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Maximize2 } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";

const previews = [
  {
    src: "/product/feedback-results.png",
    alt: "DispenseRx Practice result screen showing a failed critical safety gate and check-by-check dispensing feedback for a fictional patient case.",
    label: "Check-by-check feedback",
    detail: "Safety gates stay visible even when the total score is high.",
    className: "relative z-10",
  },
  {
    src: "/product/counselling-practice.png",
    alt: "DispenseRx Practice patient counselling screen showing a fictional conversation and assessment guidance.",
    label: "Counselling practice",
    detail: "Practise patient-friendly questions and explanations after dispensing.",
    className: "relative z-20 -mt-5 ml-auto w-[88%] sm:-mt-10 sm:w-[72%]",
  },
] as const;

export function Hero() {
  return (
    <section className="hero-grid relative overflow-hidden bg-[#061513] pb-16 pt-24 text-white lg:min-h-[820px] lg:pb-20 lg:pt-32">
      <div className="hero-orb hero-orb-one" />
      <div className="hero-orb hero-orb-two" />
      <div className="container relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-10">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Independent Australian training simulator
            </div>

            <p className="mb-4 font-mono text-sm text-emerald-300/80">
              PRACTISE BEFORE PLACEMENT
            </p>
            <h1 className="text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[4.75rem]">
              Practise Australian dispensing workflows{" "}
              <span className="mt-2 block bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                before placement.
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-300">
              Work through fictional patient scenarios, make explicit safety
              decisions and review immediate, check-by-check feedback.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="group inline-flex h-13 items-center justify-center rounded-full bg-emerald-300 px-7 py-3.5 font-bold text-[#06201b] shadow-[0_0_40px_rgba(110,231,183,.22)] transition hover:-translate-y-0.5 hover:bg-emerald-200"
              >
                Try 2 cases free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-13 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/[0.08]"
              >
                How it works
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-slate-300">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Try 2 of {STATIC_CASES.length} cases free</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> No card required</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Instant feedback</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl" aria-label="Real DispenseRx Practice product previews">
            <div className="absolute -inset-8 rounded-[3rem] bg-emerald-400/[0.06] blur-3xl" />
            {previews.map((preview) => (
              <figure key={preview.src} className={preview.className}>
                <a
                  href={preview.src}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-2xl border border-white/15 bg-[#0b1d1a] shadow-[0_30px_90px_rgba(0,0,0,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#061513]"
                  aria-label={`Enlarge ${preview.label.toLowerCase()} screenshot`}
                >
                  <Image
                    src={preview.src}
                    alt={preview.alt}
                    width={1586}
                    height={992}
                    priority={preview.src === previews[0].src}
                    sizes={preview.src === previews[0].src ? "(max-width: 1023px) 100vw, 58vw" : "(max-width: 639px) 88vw, (max-width: 1023px) 72vw, 42vw"}
                    className="h-auto w-full transition duration-300 group-hover:scale-[1.01]"
                  />
                  <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#061513]/85 text-emerald-200 opacity-90 backdrop-blur transition group-hover:bg-[#061513]" aria-hidden="true">
                    <Maximize2 className="h-4 w-4" />
                  </span>
                </a>
                <figcaption className="mt-3 rounded-xl border border-white/10 bg-[#102622]/95 px-4 py-3 shadow-xl backdrop-blur">
                  <p className="text-sm font-bold text-white">{preview.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{preview.detail} Tap or click to enlarge.</p>
                </figcaption>
              </figure>
            ))}
            <p className="relative z-20 mt-4 text-right text-xs text-slate-400">
              Real product captures · fictional patient information
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
