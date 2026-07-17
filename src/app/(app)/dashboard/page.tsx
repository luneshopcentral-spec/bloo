import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import type { Database } from "@/lib/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type AttemptRow = Database["public"]["Tables"]["attempts"]["Row"];
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
  PlayCircle,
  ArrowRight,
  BarChart3,
  Target,
  ShieldCheck,
} from "lucide-react";

function readableCompetency(key: string): string {
  return key
    .replace(/^dispensing:/, "Dispensing · ")
    .replace(/^counselling:/, "Counselling · ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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
  const { data: attemptData, error: attemptError } = await supabase
    .from("attempts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const attempts = (attemptData as AttemptRow[] | null) ?? [];
  const independentAttempts = attempts.filter((attempt) => (
    attempt.counts_toward_progress !== false && !attempt.assisted
  ));
  const passedAttempts = independentAttempts.filter((attempt) => attempt.passed).length;
  const averageScore = independentAttempts.length
    ? Math.round(independentAttempts.reduce((total, attempt) => (
        total + (attempt.max_score > 0 ? (attempt.score / attempt.max_score) * 100 : 0)
      ), 0) / independentAttempts.length)
    : 0;
  const competencyTotals = new Map<string, { passed: number; total: number }>();
  for (const attempt of independentAttempts) {
    if (!attempt.competencies || typeof attempt.competencies !== "object" || Array.isArray(attempt.competencies)) continue;
    for (const [key, rawValue] of Object.entries(attempt.competencies)) {
      if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) continue;
      const passed = typeof rawValue.passed === "number" ? rawValue.passed : 0;
      const total = typeof rawValue.total === "number" ? rawValue.total : 0;
      const current = competencyTotals.get(key) ?? { passed: 0, total: 0 };
      competencyTotals.set(key, { passed: current.passed + passed, total: current.total + total });
    }
  }
  const competencyRows = Array.from(competencyTotals.entries())
    .map(([key, value]) => ({ key, ...value, percent: value.total ? Math.round((value.passed / value.total) * 100) : 0 }))
    .sort((a, b) => a.percent - b.percent || b.total - a.total)
    .slice(0, 6);

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
          Foundation beta · {STATIC_CASES.length} cases
        </Badge>
      </div>

      {attemptError && (
        <Card className="mb-8 border-amber-300 bg-amber-50">
          <CardContent className="p-5 text-sm text-amber-900">
            Progress is temporarily unavailable. Apply the latest Supabase attempt-progress migration, then refresh.
          </CardContent>
        </Card>
      )}

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Target className="h-8 w-8 text-emerald-600" />
            <div><p className="text-2xl font-bold">{independentAttempts.length}</p><p className="text-sm text-slate-500">Independent attempts</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <div><p className="text-2xl font-bold">{passedAttempts}/{independentAttempts.length}</p><p className="text-sm text-slate-500">Critical-gate passes</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <BarChart3 className="h-8 w-8 text-violet-600" />
            <div><p className="text-2xl font-bold">{averageScore}%</p><p className="text-sm text-slate-500">Average score</p></div>
          </CardContent>
        </Card>
      </div>

      {competencyRows.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Competency focus</CardTitle>
            <CardDescription>Lowest independent performance first; assisted and Learn-mode attempts are excluded.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {competencyRows.map((competency) => (
              <div key={competency.key} className="rounded-lg border p-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{readableCompetency(competency.key)}</span>
                  <strong>{competency.percent}%</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                  <div className="h-full bg-emerald-600" style={{ width: `${competency.percent}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{competency.passed}/{competency.total} checks passed</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                {STATIC_CASES.length} cases — foundation to Schedule 8
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
