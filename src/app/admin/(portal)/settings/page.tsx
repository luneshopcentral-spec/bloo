import { requireAdmin } from "@/lib/admin/guard";
import { loadSettings } from "@/lib/admin/settings";
import { paidAccessAvailable } from "@/lib/governance/availability";
import { getPaidReleaseReadiness } from "@/lib/governance/editorial";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await loadSettings();
  const paidReady = paidAccessAvailable();
  const readiness = getPaidReleaseReadiness();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Operational toggles applied at runtime.</p>
      </div>

      <SettingsForm settings={settings} />

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium">Paid launch status</h2>
        <p className="mt-1 text-sm text-slate-600">
          Read-only. Governed by environment configuration and content approval, not this page — this is the
          single source of truth for whether checkout is open.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${paidReady ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="text-sm font-medium">{paidReady ? "Paid access is LIVE" : "Paid access is closed"}</span>
        </div>
        {!readiness.ready && readiness.blockers.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600">
            {readiness.blockers.slice(0, 8).map((blocker, index) => (
              <li key={index}>{blocker}</li>
            ))}
            {readiness.blockers.length > 8 && <li>…and {readiness.blockers.length - 8} more</li>}
          </ul>
        )}
      </section>
    </div>
  );
}
