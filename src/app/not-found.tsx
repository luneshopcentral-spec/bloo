import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-lg text-center"><p className="text-sm font-semibold uppercase tracking-widest text-emerald-800">404</p><h1 className="mt-3 text-4xl font-bold text-slate-900">That page is not on the dispensary shelf</h1><p className="mt-4 leading-7 text-slate-600">The address may have changed, or the page may no longer exist.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/" className="rounded-md bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Return home</Link><Link href="/support" className="rounded-md border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-100">Contact support</Link></div></div>
    </main>
  );
}
