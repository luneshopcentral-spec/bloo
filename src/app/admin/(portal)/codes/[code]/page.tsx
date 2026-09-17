import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, isFuture } from "@/lib/admin/format";
export const dynamic = "force-dynamic";
export default async function CodeDetail({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { code } = await params;
  if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code)) notFound();
  const page = Math.min(
    100000,
    Math.max(1, Number.parseInt((await searchParams).page ?? "1") || 1),
  );
  const admin = createAdminClient();
  const { data: c, error: codeError } = await admin
    .from("access_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (codeError)
    return <p role="alert">Could not load the code. Please try again.</p>;
  if (!c) notFound();
  const {
    data: redemptions,
    error,
    count,
  } = await admin
    .from("access_code_redemptions")
    .select("*", { count: "exact" })
    .eq("code", code)
    .order("redeemed_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  const ids = (redemptions ?? []).map((r) => r.user_id);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id,email,full_name").in("id", ids)
    : { data: [] };
  const users = new Map((profiles ?? []).map((p) => [p.id, p]));
  const minutes = c.grants_minutes ?? c.grants_days * 1440;
  return (
    <div className="space-y-6">
      <Link href="/codes" className="text-sm text-slate-600 underline">
        Back to access codes
      </Link>
      <header>
        <h1 className="text-2xl font-semibold font-mono">{c.code}</h1>
        <p className="mt-2 text-slate-600">{c.description || "Access code"}</p>
      </header>
      <dl className="grid gap-5 rounded-xl border bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-sm text-slate-600">Access per redemption</dt>
          <dd className="mt-1 font-medium">
            {minutes % 1440 === 0
              ? `${minutes / 1440} days`
              : minutes % 60 === 0
                ? `${minutes / 60} hours`
                : `${minutes} minutes`}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Usage</dt>
          <dd className="mt-1 font-medium">
            {c.redemptions} / {c.max_redemptions ?? "Unlimited"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Redeem before</dt>
          <dd className="mt-1 font-medium">
            {c.expires_at ? formatDateTime(c.expires_at) : "No deadline"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Available to</dt>
          <dd className="mt-1 font-medium break-words">
            {c.assigned_email ?? "Any registered user"}
          </dd>
        </div>
      </dl>
      <section className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 font-semibold">Redemption history</h2>
        <p className="mb-4 text-sm text-slate-600">
          The recorded expiry is the grant at redemption time. Open the user to
          see current access or revoke a grant.
        </p>
        {error ? (
          <p role="alert">Could not load redemptions.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-3">User</th>
                    <th>Redeemed</th>
                    <th>Granted until</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions?.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-3 pr-4">
                        <Link
                          className="text-blue-700 underline"
                          href={`/users/${r.user_id}`}
                        >
                          {users.get(r.user_id)?.email ?? r.user_id}
                        </Link>
                      </td>
                      <td className="pr-4">{formatDateTime(r.redeemed_at)}</td>
                      <td>
                        {formatDateTime(r.granted_until)}
                        {!isFuture(r.granted_until) && (
                          <span className="ml-2 text-slate-600">Expired</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!redemptions?.length && (
              <p className="py-6 text-slate-600">No redemptions yet.</p>
            )}
            <nav
              aria-label="Redemption pages"
              className="mt-4 flex gap-4 text-sm"
            >
              {page > 1 && (
                <Link href={`?page=${page - 1}`} className="underline">
                  Previous
                </Link>
              )}
              <span>
                Page {page} · {count ?? 0} redemptions
              </span>
              {page * 50 < (count ?? 0) && (
                <Link href={`?page=${page + 1}`} className="underline">
                  Next
                </Link>
              )}
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
