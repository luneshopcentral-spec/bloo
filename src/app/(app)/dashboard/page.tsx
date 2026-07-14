import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Construction,
  PlayCircle,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: ProfileRow | null; error: unknown };

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            Ready to practise your dispensing skills?
          </p>
        </div>

        <Badge
          variant="outline"
          className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-3 py-1"
        >
          Foundation beta · 6 cases
        </Badge>
      </div>

      <Card className="mb-8 border-dashed">
        <CardContent className="flex items-start gap-3 p-5">
          <Construction className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold text-slate-900">Persistent progress is coming next</p>
            <p className="mt-1 text-sm text-slate-600">
              The current beta shows an independent session score inside the simulator.
              Attempt history, averages and skill trends are not yet saved to this dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main CTA */}
      <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
              <PlayCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Start Practising</CardTitle>
              <CardDescription>
                Six foundation cases available
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Work through realistic PBS dispensing scenarios, just like you would
            in Fred Dispense. Get instant feedback on every step.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/practice">
                Browse Cases
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
