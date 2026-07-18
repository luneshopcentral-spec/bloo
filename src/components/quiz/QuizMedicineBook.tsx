"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, X } from "lucide-react";
import {
  MEDICINE_LEARNING_PROFILES,
  normalizeMedicineQuery,
} from "@/lib/medicines-learning/reference";

type BookTab = "overview" | "doses" | "labels" | "interactions" | "safety";

interface QuizMedicineBookProps {
  open: boolean;
  onClose: () => void;
  relevantProfileIds: string[];
}

const TABS: { id: BookTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "doses", label: "Age & dose" },
  { id: "labels", label: "Warning labels" },
  { id: "interactions", label: "Interactions" },
  { id: "safety", label: "Side effects & urgent care" },
];

export function QuizMedicineBook({ open, onClose, relevantProfileIds }: QuizMedicineBookProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(relevantProfileIds[0] ?? MEDICINE_LEARNING_PROFILES[0]?.id ?? "");
  const [tab, setTab] = useState<BookTab>("overview");
  const searchRef = useRef<HTMLInputElement>(null);

  const profiles = useMemo(() => {
    const normalized = normalizeMedicineQuery(query);
    const matches = normalized
      ? MEDICINE_LEARNING_PROFILES.filter((profile) => {
          const haystack = normalizeMedicineQuery([
            profile.genericName,
            profile.medicineClass,
            ...profile.aliases,
            ...profile.products.map((product) => product.product),
          ].join(" "));
          return haystack.includes(normalized);
        })
      : [...MEDICINE_LEARNING_PROFILES];

    return matches.sort((a, b) => {
      const aRelevant = relevantProfileIds.includes(a.id) ? 0 : 1;
      const bRelevant = relevantProfileIds.includes(b.id) ? 0 : 1;
      return aRelevant - bRelevant || a.genericName.localeCompare(b.genericName);
    });
  }, [query, relevantProfileIds]);

  const activeProfile = profiles.find((profile) => profile.id === selectedId) ?? profiles[0] ?? null;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedId(relevantProfileIds[0] ?? MEDICINE_LEARNING_PROFILES[0]?.id ?? "");
    setTab("overview");
    requestAnimationFrame(() => searchRef.current?.focus());

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose, relevantProfileIds]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-medicine-book-title"
        className="flex h-[min(900px,calc(100vh-2rem))] w-[min(1500px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-500/20 p-2"><BookOpen className="h-5 w-5 text-emerald-300" /></span>
            <div>
              <h2 id="quiz-medicine-book-title" className="font-bold">Medicines learning book</h2>
              <p className="text-xs text-slate-300">Use the tables, then apply them to the exact patient, indication, formulation and prescription.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Close medicines book">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 p-3">
              <label htmlFor="quiz-book-search" className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Search all medicines</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  ref={searchRef}
                  id="quiz-book-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Medicine or brand"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {profiles.map((profile) => {
                const relevant = relevantProfileIds.includes(profile.id);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(profile.id);
                      setTab("overview");
                    }}
                    className={`mb-1 w-full rounded-lg border px-3 py-2.5 text-left transition ${
                      activeProfile?.id === profile.id
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : "border-transparent hover:border-slate-200 hover:bg-white"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                      {profile.genericName}
                      {relevant && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] uppercase text-blue-800">On script</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{profile.medicineClass}</span>
                  </button>
                );
              })}
              {!profiles.length && <p className="p-3 text-sm text-slate-500">No matching medicine profile.</p>}
            </div>
          </aside>

          <article className="min-h-0 overflow-y-auto">
            {activeProfile ? (
              <>
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 pt-5 backdrop-blur">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-950">{activeProfile.genericName}</h3>
                      <p className="text-sm text-slate-500">{activeProfile.medicineClass}</p>
                    </div>
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                      Pharmacist review required
                    </span>
                  </div>
                  <nav className="flex gap-1 overflow-x-auto" aria-label="Medicine book sections">
                    {TABS.map((bookTab) => (
                      <button
                        key={bookTab.id}
                        type="button"
                        onClick={() => setTab(bookTab.id)}
                        className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${
                          tab === bookTab.id
                            ? "border-emerald-600 text-emerald-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {bookTab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {tab === "overview" && (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">{activeProfile.summary}</div>
                      <dl className="grid gap-3 md:grid-cols-2">
                        {activeProfile.quickFacts.map((fact) => (
                          <div key={fact.label} className="rounded-lg border border-slate-200 p-3">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{fact.label}</dt>
                            <dd className="mt-1 text-sm text-slate-900">{fact.value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {activeProfile.sections.map((section) => (
                          <section key={section.id} className="rounded-xl border border-slate-200 p-4">
                            <h4 className="font-bold text-slate-900">{section.heading}</h4>
                            <p className="mt-1 text-sm leading-5 text-slate-600">{section.summary}</p>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                              {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                            </ul>
                          </section>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "doses" && (
                    <ReferenceTable
                      headers={["Population", "Indication", "Product-information dose or range", "Checks"]}
                      rows={activeProfile.clinicalGuide.dosing.map((row) => [row.population, row.indication, row.productInformationDose, row.notes])}
                    />
                  )}

                  {tab === "labels" && (
                    <ReferenceTable
                      headers={["Code", "Label wording", "When it applies", "Why"]}
                      rows={activeProfile.clinicalGuide.warningLabels.map((label) => [label.code, label.label, label.appliesWhen, label.rationale])}
                    />
                  )}

                  {tab === "interactions" && (
                    <ReferenceTable
                      headers={["Medicine, product or factor", "Risk", "Action"]}
                      rows={activeProfile.clinicalGuide.interactions.map((row) => [row.medicineOrClass, row.risk, row.action])}
                    />
                  )}

                  {tab === "safety" && (
                    <div className="grid gap-5 lg:grid-cols-2">
                      <section className="rounded-xl border border-slate-200 p-5">
                        <h4 className="font-bold text-slate-900">Common side effects</h4>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                          {activeProfile.clinicalGuide.commonSideEffects.map((effect) => <li key={effect}>{effect}</li>)}
                        </ul>
                      </section>
                      <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                        <h4 className="font-bold text-red-950">Seek urgent care or immediate advice</h4>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-red-900">
                          {activeProfile.clinicalGuide.urgentCare.map((symptom) => <li key={symptom}>{symptom}</li>)}
                        </ul>
                      </section>
                    </div>
                  )}

                  <footer className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    <strong>Training governance:</strong> {activeProfile.reviewNote} Version {activeProfile.version}; content updated {activeProfile.contentUpdatedAt}.
                  </footer>
                </div>
              </>
            ) : (
              <div className="p-8 text-sm text-slate-500">Choose a medicine profile.</div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}

function ReferenceTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
            <tr>{headers.map((header) => <th key={header} className="border-b border-slate-200 px-4 py-3 font-bold">{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className="align-top odd:bg-white even:bg-slate-50/60">
                {row.map((cell, cellIndex) => (
                  <td key={`${cellIndex}-${cell}`} className={`min-w-40 px-4 py-3 leading-5 text-slate-700 ${cellIndex === 0 ? "font-semibold text-slate-900" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
        Learning summary only. Match the exact product, indication, age, weight, organ function and current Australian source before acting.
      </p>
    </div>
  );
}
