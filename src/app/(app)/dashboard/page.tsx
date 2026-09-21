import { checkoutAvailability } from "@/lib/governance/availability";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { isPlanId, PLAN_OPTIONS } from "@/lib/billing/plan";
import { hasCompAccess } from "@/lib/entitlement/entitlement";
import { RedeemCode } from "@/components/app/redeem-code";
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
  searchParams: Promise<{ checkout?: string; billing?: string; plan?: string; session_id?: string }>;
}) {
  const supabase = await createClient();
  const { checkout, billing, plan } = await searchParams;
  const selectedPlan = isPlanId(plan) ? plan : null;
  const checkoutState = checkoutAvailability();

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
  const hasFullAccess =
    profile?.has_paid === true
    || profile?.role === "admin"
    || hasCompAccess(profile ? { has_paid: profile.has_paid, role: profile.role, comp_access_until: profile.comp_access_until } : null);
  const { data: attemptData, error: attemptError } = await supabase
    .from("attempts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const attempts = (attemptData as AttemptRow[] | null) ?? [];
  const independentAttempts = attempts.filter((attempt) => (
    attempt.server_verified === true && attempt.counts_toward_progress !== false && !attempt.assisted
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            Practise a case, review your feedback and build confidence for the pharmacy counter.
          </p>
        </div>

        <Badge
          variant="outline"
          className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-3 py-1"
        >
          Foundation beta · {STATIC_CASES.length} cases
        </Badge>
      </div>

      <Card id="access-code" className="mb-6 scroll-mt-6 border-emerald-200">
        <CardHeader>
          <h2 className="text-lg font-semibold tracking-tight">Have a student access code?</h2>
          <CardDescription>Enter the code from your test-group organiser to unlock all {STATIC_CASES.length} cases for the agreed time. No payment or card is needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <RedeemCode activeUntil={profile?.comp_access_until ?? null} />
          <p className="mt-3 text-xs text-slate-600">Have a Stripe discount code instead? Enter it under “Add promotion code” on the Stripe checkout page after choosing a subscription below.</p>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-slate-50">
        <CardHeader><h2 className="text-lg font-semibold tracking-tight">Your first test session</h2><CardDescription>Use a laptop or desktop for the simulator.</CardDescription></CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Redeem your group’s code above, if you have one.</li>
            <li>Open the simulator and choose <strong>Guided tutorial</strong>. Learn mode helps you explore without affecting independent progress.</li>
            <li>Try a case independently in Practice mode, then review the feedback.</li>
            <li>Tell us where you got stuck, which patient replies felt wrong, or which marks seemed unclear.</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm"><Link href="/practice">Open simulator</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/account#report">Send tester feedback</Link></Button>
          </div>
          <p className="text-xs text-slate-600">Beta training with fictional cases. Check clinical guidance with your educator and current references.</p>
        </CardContent>
      </Card>

      {checkout === "success" && (
        <Card className="mb-8 border-emerald-300 bg-emerald-50">
          <CardContent className="p-5 text-sm text-emerald-900">
            Checkout returned. Your access status below updates after Stripe
            confirms the subscription. This return link alone does not confirm payment. Refresh if a case still shows locked, or{" "}
            <Link href="/support" className="font-medium underline">contact support</Link>.
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
            Something went wrong starting checkout. Please try again, or{" "}
            <Link href="/support" className="font-medium underline">contact support</Link>.
          </CardContent>
        </Card>
      )}
      {checkout === "profile" && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardContent className="p-5 text-sm text-red-900">
            Your customer profile could not be found, so no checkout was created. Please{" "}
            <Link href="/support" className="font-medium underline">contact support</Link>.
          </CardContent>
        </Card>
      )}
      {["terms", "customer", "configuration"].includes(checkout ?? "") && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardContent className="p-5 text-sm text-red-900">
            {checkout === "terms" && "Checkout is unavailable because the Stripe account has no valid terms of service URL configured."}
            {checkout === "customer" && "Your billing profile could not be found in the configured Stripe account. Support needs to reconnect it before you can pay."}
            {checkout === "configuration" && "Checkout is unavailable because Stripe could not authorise the payment service."}
            {" "}No payment was taken. Please{" "}
            <Link href="/support" className="font-medium underline">contact support</Link>.
          </CardContent>
        </Card>
      )}
      {checkout === "price" && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardContent className="p-5 text-sm text-red-900">
            Checkout is unavailable because the configured Stripe price is missing or does not match the published plan. No payment was taken. Please{" "}
            <Link href="/support" className="font-medium underline">contact support</Link>.
          </CardContent>
        </Card>
      )}
      {checkout === "unavailable" && (
        <Card className="mb-8 border-amber-300 bg-amber-50">
          <CardContent className="p-5 text-sm text-amber-950">
            Paid beta access is not open yet. Clinical, legal and support readiness checks must be completed before production payments are accepted. You can keep practising the free cases.
          </CardContent>
        </Card>
      )}
      {billing === "error" && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">
            Something went wrong opening the subscription management page. Please try again, or{" "}
            <Link href="/support" className="font-medium underline">contact support</Link>.
          </CardContent>
        </Card>
      )}

      {/* Billing / entitlement */}
      {checkoutState.testMode && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-5 text-sm text-blue-950">
            <strong>Stripe sandbox</strong> — use a Stripe test card. No real payments are taken.
            {hasFullAccess && !profile?.has_paid && <>
              <p className="mt-2">You already have access, but you can still test checkout. Use a separate student account to test unlocking cases.</p>
              <div className="mt-3 flex flex-wrap gap-2">{PLAN_OPTIONS.map(option => (
                <form action="/api/checkout" method="post" key={option.id}>
                  <input type="hidden" name="plan" value={option.id} />
                  <Button type="submit" variant="outline">Test {option.shortName.toLowerCase()} · {option.priceDisplay}/{option.interval}</Button>
                </form>
              ))}</div>
            </>}
          </CardContent>
        </Card>
      )}
      {hasFullAccess ? (
        <Card className="mb-8 border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-emerald-900">
              <strong>Full access active.</strong>{" "}
              {profile?.role === "admin"
                ? "Developer account — all cases unlocked."
                : profile?.has_paid ? "All cases are unlocked with your subscription."
                : "All cases are unlocked through your time-limited access grant. No subscription is required."}
              {profile?.role !== "admin" && profile?.subscription_plan && (
                <span className="mt-1 block text-xs text-emerald-800">
                  {profile.subscription_plan === "yearly" ? "Annual" : "Monthly"} plan
                  {profile.subscription_status ? ` · ${profile.subscription_status.replaceAll("_", " ")}` : ""}
                  {profile.subscription_current_period_end
                    ? ` · current period ends ${new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(profile.subscription_current_period_end))}`
                    : ""}
                  {profile.subscription_cancel_at_period_end ? " · cancellation scheduled" : ""}
                </span>
              )}
            </div>
            {profile?.stripe_customer_id && (profile?.role !== "admin" || checkoutState.testMode) && (
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
              Use your student access code above or choose a subscription to unlock all {STATIC_CASES.length} cases.
            </div>
            <div className="flex gap-2">
              {checkoutState.available ? PLAN_OPTIONS.map((option) => (
                <form action="/api/checkout" method="post" key={option.id}>
                  <input type="hidden" name="plan" value={option.id} />
                  <Button type="submit" size="sm" variant={selectedPlan && selectedPlan !== option.id ? "outline" : "default"} className="whitespace-nowrap">
                    {option.priceDisplay}/{option.interval}
                  </Button>
                </form>
              )) : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Paid access is not open yet. The free cases remain available.</p>}
            </div>
            {selectedPlan && <p className="text-xs text-slate-600">Your {selectedPlan === "yearly" ? "annual" : "monthly"} choice from sign-up is selected.</p>}
          </CardContent>
        </Card>
      )}

      {attemptError && (
        <Card className="mb-8 border-amber-300 bg-amber-50">
          <CardContent className="p-5 text-sm text-amber-900">
            Your progress could not be loaded. Refresh the page or contact support if this continues. Your saved attempts have not been changed.
          </CardContent>
        </Card>
      )}

      <p className="mb-3 text-sm text-slate-600">Progress covers your latest 100 attempts. Only independently completed, server-verified attempts count; tutorials and Learn mode are excluded.</p>
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
