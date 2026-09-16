import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { CodesManager, type AccessCodeRow } from "@/components/admin/CodesManager";

export const dynamic = "force-dynamic";

export default async function AdminCodesPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("access_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows: AccessCodeRow[] = (data ?? []).map((c) => ({
    code: c.code,
    description: c.description,
    grantsDays: c.grants_days,
    maxRedemptions: c.max_redemptions,
    redemptions: c.redemptions,
    active: c.active,
    expiresAt: c.expires_at,
    createdAt: c.created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Access codes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Issue codes that unlock full access for a set number of days. Users redeem them on their account page.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Access-code tables unavailable — has migration 0018 been applied?
        </p>
      ) : (
        <CodesManager rows={rows} />
      )}
    </div>
  );
}
