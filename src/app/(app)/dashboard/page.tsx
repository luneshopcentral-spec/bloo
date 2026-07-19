import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { PLAN } from "@/lib/billing/plan";
import type { Database } from "@/lib/types/database";

const FREE_CASE_COUNT = STATIC_CASES.filter((c) => c.isFree).length;

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
  BrainCircuit,
} from "lucide-react";

function readableCompetency(key: string): string {
  return key
    .replace(/^dispensing:/, "Dispensing · ")
    .replace(/^counselling:/, "Counselling · ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; billing?: string }>;
}) {
  const supabase = await createClient();
  const { checkout } = await searchParams;

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
  const hasFullAccess = profile?.has_paid === true || profile?.role === "admin";
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

      {checkout === "success" && (
        <Card className="mb-8 border-emerald-300 bg-emerald-50">
          <CardContent className="p-5 text-sm text-emerald-900">
            Payment confirmed — thank you! Full access unlocks as soon as Stripe
            notifies us (usually within seconds). Refresh if a case still shows locked.
          </CardContent>
        </Card>
      )}
      {checkout === "cancelled" && (
        <Card className="mb-8 border-slate-300 bg-slate-50">
          <CardContent className="p-5 text-sm text-slate-700">
            Checkout cancelled — no payment was taken. You can subscribe anytime.
          </CardContent>
        </Card>
      )}
      {checkout === "error" && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">
            Something went wrong starting checkout. Please try again, or contact support.
          </CardContent>
        </Card>
      )}

      {/* Billing / entitlement */}
      {hasFullAccess ? (
        <Card className="mb-8 border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-emerald-900">
              <strong>Full access active.</strong>{" "}
              {profile?.role === "admin"
                ? "Developer account — all cases unlocked."
                : "All cases are unlocked. Thanks for subscribing."}
            </div>
            {profile?.role !== "admin" && (
              <form action="/api/billing-portal" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Manage subscription
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              <strong>You&rsquo;re on the free demo</strong> — the first {FREE_CASE_COUNT} cases.
              Unlock all {STATIC_CASES.length} cases with {PLAN.name} for {PLAN.priceDisplay}/{PLAN.interval}.
            </div>
            <form action="/api/checkout" method="post">
              <Button type="submit" size="sm" className="whitespace-nowrap">
                Unlock full access
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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
      <div className="grid gap-5 md:grid-cols-2">
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

      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Consultation quizzes</CardTitle>
              <CardDescription>10 hard case sets · 40 questions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Analyse single and double prescriptions using the medicines book,
            then choose the safest patient-facing response.
          </p>
          <Button size="lg" variant="outline" className="gap-2 border-blue-300 bg-white text-blue-800 hover:bg-blue-50" asChild>
            <Link href="/quiz">
              Open Quizzes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
