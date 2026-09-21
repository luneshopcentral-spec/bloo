import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CodesManager,
  type AccessCodeRow,
} from "@/components/admin/CodesManager";

export const dynamic = "force-dynamic";

export default async function AdminCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.min(
    100000,
    Math.max(1, Number.parseInt((await searchParams).page ?? "1") || 1),
  );
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("access_codes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);

  const rows: AccessCodeRow[] = (data ?? []).map((c) => ({
    code: c.code,
    description: c.description,
    grantsDays: c.grants_days,
    grantsMinutes: c.grants_minutes ?? c.grants_days * 1440,
    assignedEmail: c.assigned_email ?? null,
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
        <p className="mt-1 text-sm text-slate-600">
          Issue codes that unlock full access for a set number of minutes, hours
          or days. Students enter them on their dashboard under “Have a student access code?” or on their account page. These grant access directly; they are separate from Stripe discount codes.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Access-code data is unavailable. Check the database connection and
          apply migrations through 0019.
        </p>
      ) : (
        <>
          <CodesManager rows={rows} />
          <nav aria-label="Code pages" className="flex gap-4 text-sm">
            {page > 1 && (
              <Link href={`/codes?page=${page - 1}`} className="underline">
                Previous
              </Link>
            )}
            <span>
              Page {page} · {count ?? 0} codes
            </span>
            {page * 50 < (count ?? 0) && (
              <Link href={`/codes?page=${page + 1}`} className="underline">
                Next
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
