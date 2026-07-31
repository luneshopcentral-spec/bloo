import { BookOpenCheck, CalendarSync, Scale, ShieldCheck, Stethoscope, UserRoundCheck } from "lucide-react";
import { CASE_EDITORIAL_RECORDS, getPaidReleaseReadiness } from "@/lib/governance/editorial";

const outcomes = [
  {
    icon: BookOpenCheck,
    title: "Workflow accuracy",
    description:
      "Practise patient, prescriber, medicine, directions, quantity, repeat and label checks in one connected workflow.",
  },
  {
    icon: ShieldCheck,
    title: "Safety decisions",
    description:
      "Decide whether to dispense, hold and clarify, or refuse supply, with critical errors treated as genuine safety gates.",
  },
  {
    icon: Stethoscope,
    title: "Counselling practice",
    description:
      "Explain your reasoning to a simulated patient and review the specific topics your response covered or missed.",
  },
];

export function ProblemSolution() {
  const readiness = getPaidReleaseReadiness();
  const contentDate = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Adelaide",
  }).format(new Date(`${CASE_EDITORIAL_RECORDS[0].contentUpdatedAt}T00:00:00+09:30`));

  return (
    <section aria-labelledby="learning-outcomes-title" className="bg-slate-50 py-12 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
            What you practise
          </p>
          <h2 id="learning-outcomes-title" className="mt-3 text-3xl font-bold text-slate-900">
            Build repeatable dispensing habits before placement
          </h2>
          <p className="mt-4 text-slate-600">
            Work through complete fictional cases, receive immediate feedback and
            learn why a decision passed or failed each safety gate.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
          {outcomes.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                <Icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-3" aria-label="Content governance status">
          <div className="bg-white p-5">
            <UserRoundCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Authorship and review</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Draft cases are maintained by the DispenseRx Practice operator. No pharmacist or jurisdiction reviewer identity is published because approval has not yet been recorded.</p>
          </div>
          <div className="bg-white p-5">
            <CalendarSync className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Currency process</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Each case has versioned sources, a content date and a review record. A source change triggers re-review before the affected content can be treated as paid-release ready.</p>
          </div>
          <div className="bg-white p-5">
            <Scale className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Assessment boundary</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Feedback checks only the defined fictional case workflow and counselling topics. It does not certify competence, placement readiness or legal compliance.</p>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:flex sm:items-start sm:gap-5">
          <Scale className="h-7 w-7 shrink-0 text-amber-800" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-amber-950">Transparent content status</h3>
            <p className="mt-2 text-sm leading-6 text-amber-950/80">
              The {CASE_EDITORIAL_RECORDS.length}-case source register was last updated {contentDate} for a
              Victorian training context. Pharmacist and jurisdiction approvals are still
              recorded as required, so production paid checkout remains blocked ({readiness.blockers.length} review records outstanding).
              DispenseRx Practice is independent of Fred IT and does not assess clinical competence
              or replace current product, PBS, legal, university or supervisor guidance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
