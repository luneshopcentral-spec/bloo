import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/app-nav";
import { AnnouncementBanner, type ActiveAnnouncement } from "@/components/app/AnnouncementBanner";
import { loadSettings } from "@/lib/admin/settings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Maintenance mode: hold non-admin users at a notice; admins keep full access
  // so they can still operate the portal and verify fixes.
  const settings = await loadSettings();
  if (settings.maintenance_mode) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold">Down for maintenance</h1>
            <p className="mt-2 text-sm text-slate-600">{settings.maintenance_message}</p>
          </div>
        </div>
      );
    }
  }

  // RLS only returns announcements inside their active window; a missing table
  // (pre-migration) simply yields none.
  let announcements: ActiveAnnouncement[] = [];
  try {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, body, level")
      .order("starts_at", { ascending: false })
      .limit(5);
    announcements = (data ?? []) as ActiveAnnouncement[];
  } catch {
    announcements = [];
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AppNav userEmail={user.email ?? ""} />
      <AnnouncementBanner announcements={announcements} />
      {/* No container/padding here — each page owns its own layout */}
      <main id="main-content">{children}</main>
    </div>
  );
}
