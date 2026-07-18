import { FileText, UserRound } from "lucide-react";
import type { ConsultationQuizCase } from "@/lib/quiz/types";

interface QuizPrescriptionProps {
  quizCase: ConsultationQuizCase;
}

export function QuizPrescription({ quizCase }: QuizPrescriptionProps) {
  const { patient } = quizCase;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-300 bg-[#fffdf5] shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-300 bg-slate-100 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <FileText className="h-4 w-4" /> Prescription{quizCase.prescriptions.length > 1 ? "s" : ""}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Training case</span>
        </div>

        <div className="border-b border-dashed border-slate-300 px-4 py-3 text-sm">
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <p><span className="font-semibold">Patient:</span> {patient.name}</p>
            <p><span className="font-semibold">DOB:</span> {patient.dateOfBirth} ({patient.age})</p>
            <p className="sm:col-span-2"><span className="font-semibold">Address:</span> {patient.address}</p>
            {patient.weight && <p><span className="font-semibold">Weight:</span> {patient.weight}</p>}
          </div>
        </div>

        {quizCase.prescriptions.map((script, scriptIndex) => (
          <article key={script.id} className={scriptIndex > 0 ? "border-t-4 border-double border-slate-300" : ""}>
            <div className="grid gap-2 border-b border-slate-200 px-4 py-3 text-xs sm:grid-cols-3">
              <div><span className="block font-semibold uppercase text-slate-500">Prescriber</span>{script.prescriber}</div>
              <div><span className="block font-semibold uppercase text-slate-500">Prescriber no.</span>{script.prescriberNumber}</div>
              <div><span className="block font-semibold uppercase text-slate-500">Date</span>{script.date}</div>
            </div>

            <div className="divide-y divide-dashed divide-slate-300">
              {script.items.map((item, itemIndex) => (
                <div key={`${script.id}-${item.product}`} className="px-4 py-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Rx {script.items.length > 1 ? itemIndex + 1 : ""}</p>
                      <h3 className="text-base font-bold text-slate-950">{item.product}</h3>
                      <p className="text-sm text-slate-600">{item.formAndStrength}</p>
                    </div>
                    {item.authority && (
                      <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                        Authority {item.authority}
                      </span>
                    )}
                  </div>
                  <p className="my-3 rounded border-l-4 border-blue-700 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                    {item.directions}
                  </p>
                  <div className="flex gap-6 text-xs text-slate-700">
                    <span><strong>Qty:</strong> {item.quantity}</span>
                    <span><strong>Repeats:</strong> {item.repeats}</span>
                  </div>
                </div>
              ))}
            </div>

            {script.annotations?.length ? (
              <div className="border-t border-slate-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                {script.annotations.join(" · ")}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-950">
          <UserRound className="h-4 w-4" /> Information gathered at the consultation
        </div>
        <ul className="space-y-2 text-sm leading-5 text-blue-950">
          {patient.consultationNotes.map((note) => (
            <li key={note} className="flex gap-2">
              <span aria-hidden="true" className="mt-1 text-blue-500">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
