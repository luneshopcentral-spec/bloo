import { FileText, Laptop, MessageSquareText, ShieldAlert } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";

const coverage = [
  { icon: FileText, title: "Foundation dispensing", copy: "Patient and prescriber entry, product selection, directions, quantities, repeats, labels and warning statements." },
  { icon: ShieldAlert, title: "Higher-risk scenarios", copy: "Authority, Schedule 8, high-risk medicine, repeat-timing and prescription-authentication decisions." },
  { icon: MessageSquareText, title: "Patient counselling", copy: "A simulated conversation follows every case, with topic-level feedback and unsafe-advice checks." },
  { icon: Laptop, title: "Laptop-first practice", copy: "No download is required. The detailed simulator is intentionally optimised for laptop and desktop browsers." },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="coverage-title" className="py-12 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Representative coverage</p>
          <h2 id="coverage-title" className="mt-3 text-3xl font-bold text-slate-900">{STATIC_CASES.length} fictional cases from foundations to safety gates</h2>
          <p className="mt-4 text-slate-600">The library combines workflow transcription, explicit clinical decisions, immediate feedback and counselling practice.</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
          {coverage.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><Icon className="h-5 w-5 text-emerald-700" aria-hidden="true" /></span>
              <div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
