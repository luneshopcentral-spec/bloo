"use client";
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-xl space-y-4 px-6 py-20"><h1 className="text-2xl font-bold">This page could not load</h1><p>Please retry. Your saved account progress is kept.</p>{error.digest && <p className="text-sm">Support reference: {error.digest}</p>}<button className="rounded-lg bg-emerald-800 px-4 py-2 text-white" onClick={reset}>Try again</button><p><a href="/account#report" className="text-emerald-800 underline">Report this problem</a></p></section>;
}
