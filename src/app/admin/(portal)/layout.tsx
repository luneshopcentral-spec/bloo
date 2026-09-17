import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminDenied } from "@/components/admin/AdminDenied";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return <AdminDenied email={user.email ?? ""} />;
  }

  return <AdminShell email={profile?.email ?? user.email ?? ""}>{children}</AdminShell>;
}
