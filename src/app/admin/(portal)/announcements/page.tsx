import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnnouncementsManager, type AnnouncementRow } from "@/components/admin/AnnouncementsManager";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows: AnnouncementRow[] = (data ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    level: a.level,
    active: a.active,
    startsAt: a.starts_at,
    endsAt: a.ends_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Active announcements appear as a banner to signed-in users until they dismiss them or the window ends.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Announcements table unavailable — has migration 0018 been applied?
        </p>
      ) : (
        <AnnouncementsManager rows={rows} />
      )}
    </div>
  );
}
