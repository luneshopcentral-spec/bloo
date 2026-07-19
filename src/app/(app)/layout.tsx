import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "development" && process.env.CODEX_UI_CHECK === "1") {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppNav userEmail="local-ui-check@example.com" />
        <main>{children}</main>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav userEmail={user.email ?? ""} />
      {/* No container/padding here — each page owns its own layout */}
      <main>{children}</main>
    </div>
  );
}
