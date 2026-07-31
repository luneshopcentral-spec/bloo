import { ChevronDown } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";

const faqs = [
  {
    q: "What can I try for free?",
    a: `You can practise 2 of ${STATIC_CASES.length} cases with full scoring and counselling feedback. No card is required and the free access does not automatically convert to a subscription.`,
  },
  {
    q: "Is DispenseRx Practice affiliated with Fred IT Group?",
    a: "No. DispenseRx Practice is an independent training simulator. It is not affiliated with, endorsed by or connected to Fred IT Group Pty Ltd. Fred Dispense is a trademark of Fred IT Group Pty Ltd.",
  },
  {
    q: "How realistic is the simulator?",
    a: "The simulator covers patient and medicine selection, directions, quantity, repeats, warning labels, physical assembly for the foundation case, explicit safety decisions and patient counselling. It does not reproduce every production-system feature and must not be treated as an exact replica.",
  },
  {
    q: "What does the tool assess?",
    a: "It checks the information and safety decisions defined in each fictional case and reports missed counselling topics. It does not certify clinical competence, placement readiness or legal compliance.",
  },
  {
    q: "Is this a clinical, legal or PBS reference?",
    a: "No. Use current product information, PBS listings, legislation, university guidance and supervisor feedback for real decisions. The source register is versioned, but clinical and jurisdiction review must be completed before paid production release.",
  },
  {
    q: "Who is it for?",
    a: "It is designed for Australian pharmacy students, postgraduate students, intern pharmacists and internationally qualified pharmacists who want structured workflow practice before supervised work or assessment.",
  },
  {
    q: "What device should I use?",
    a: "The marketing site and account flow work on mobile. The detailed simulator is intentionally designed for a laptop or desktop browser and requires no download.",
  },
];

export function FAQ() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-slate-50 py-12 sm:py-20">
      <div className="container">
        <h2 id="faq-title" className="text-center text-3xl font-bold text-slate-900">
          Frequently asked questions
        </h2>
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-slate-200 bg-white px-5 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold text-slate-900 focus-visible:outline-none">
                {q}
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-600 transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="border-t border-slate-100 pb-5 pt-4 text-sm leading-6 text-slate-700">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
