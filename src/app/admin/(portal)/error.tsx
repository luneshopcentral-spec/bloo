"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <section role="alert" className="rounded-xl border border-amber-200 bg-white p-6"><h1 className="text-xl font-semibold">This admin page could not be loaded</h1><p className="my-3 text-slate-600">Try again. If the problem continues, check database readiness and your administrator access.</p><button onClick={reset} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Try again</button></section>;
}
