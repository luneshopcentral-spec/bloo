"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { isPlanId, planOption, type PlanId } from "@/lib/billing/plan";

const FREE_CASE_COUNT = STATIC_CASES.filter((c) => c.isFree).length;

const STUDY_STAGES = [
  ["year_1", "Year 1"],
  ["year_2", "Year 2"],
  ["year_3", "Year 3"],
  ["year_4", "Year 4"],
  ["year_5_plus", "Year 5+"],
  ["postgraduate", "Postgraduate pharmacy student"],
  ["intern", "Intern pharmacist"],
  ["internationally_qualified", "Internationally qualified pharmacist"],
  ["other", "Other"],
] as const;

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
  university: z.string().trim().max(120, "Use 120 characters or fewer").optional(),
  studyStage: z.string().optional(),
  acceptedPolicies: z.boolean().refine(Boolean, "Accept the Terms and Privacy Policy to continue"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

function friendlySignUpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already") || lower.includes("registered")) return "An account already exists for this email. Sign in or reset the password.";
  if (lower.includes("rate") || lower.includes("too many")) return "Too many requests. Wait a few minutes, then try again.";
  if (lower.includes("email")) return "We could not send the account email. Check the address or try again shortly.";
  return "We could not create the account. Try again or contact support.";
}

function destination(plan: PlanId | null): string {
  return plan ? `/dashboard?plan=${plan}` : "/dashboard";
}

export default function SignUpPage() {
  return <Suspense fallback={null}><SignUpForm /></Suspense>;
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const selectedPlan = isPlanId(planParam) ? planParam : null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acceptedPolicies: false },
  });

  function emailRedirectTo(plan: PlanId | null) {
    const next = encodeURIComponent(destination(plan));
    return `${window.location.origin}/auth/callback?next=${next}`;
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: emailRedirectTo(selectedPlan),
        data: {
          full_name: values.fullName,
          university: values.university || null,
          study_stage: values.studyStage || null,
          selected_plan: selectedPlan,
        },
      },
    });

    if (error) {
      setServerError(friendlySignUpError(error.message));
      setLoading(false);
      return;
    }
    if (!data.session) {
      setConfirmationEmail(values.email);
      setLoading(false);
      return;
    }
    router.push(destination(selectedPlan));
    router.refresh();
  }

  async function resendConfirmation() {
    if (!confirmationEmail) return;
    setResendState("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: confirmationEmail,
      options: { emailRedirectTo: emailRedirectTo(selectedPlan) },
    });
    setResendState(error ? "error" : "sent");
  }

  if (confirmationEmail) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-700" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">We sent a confirmation link to <strong className="text-slate-900">{confirmationEmail}</strong>. Delivery can take a few minutes; check spam or junk folders too.</p>
            {selectedPlan && <p className="mt-3 text-sm text-slate-600">Your {planOption(selectedPlan).shortName.toLowerCase()} selection is saved and will be waiting after confirmation.</p>}
          </div>
          <div aria-live="polite" className="text-sm text-slate-700">
            {resendState === "sent" && "A new confirmation email has been sent."}
            {resendState === "error" && "The email could not be resent. Wait a minute, then try again or contact support."}
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={resendConfirmation} disabled={resendState === "sending"}>
              {resendState === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}Resend email
            </Button>
            <Button type="button" variant="outline" onClick={() => { setConfirmationEmail(null); setResendState("idle"); }}>
              Change email
            </Button>
          </div>
          <p className="text-sm text-slate-600"><Link href="/sign-in" className="font-medium text-emerald-800 underline">Go to sign in</Link> · <Link href="/support" className="font-medium text-emerald-800 underline">Contact support</Link></p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <h1 className="text-2xl font-bold leading-none tracking-tight">Create your account</h1>
        <CardDescription>Try {FREE_CASE_COUNT} of {STATIC_CASES.length} cases free. No card required.</CardDescription>
        {selectedPlan && <p className="pt-2 text-sm font-medium text-emerald-800">Selected after sign-up: {planOption(selectedPlan).name}</p>}
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {serverError && <div role="alert" aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError} <Link href="/support" className="font-medium underline">Contact support</Link>.</div>}

          <div className="space-y-1.5"><Label htmlFor="fullName">Full name</Label><Input id="fullName" autoComplete="name" required aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "fullName-error" : undefined} {...register("fullName")} />{errors.fullName && <p id="fullName-error" className="text-xs text-red-700">{errors.fullName.message}</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />{errors.email && <p id="email-error" className="text-xs text-red-700">{errors.email.message}</p>}</div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative"><Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : "password-help"} className="pr-11" {...register("password")} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            {!errors.password && <p id="password-help" className="text-xs text-slate-600">Use at least 8 characters.</p>}{errors.password && <p id="password-error" className="text-xs text-red-700">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="confirmPassword">Confirm password</Label><Input id="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} {...register("confirmPassword")} />{errors.confirmPassword && <p id="confirmPassword-error" className="text-xs text-red-700">{errors.confirmPassword.message}</p>}</div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Optional study details</p>
            <p id="study-details-help" className="mt-1 text-xs leading-5 text-slate-600">Used to understand who is testing the beta and improve relevant learning content. They are not required for access.</p>
            <div className="mt-3 space-y-1.5"><Label htmlFor="university">University or training provider</Label><Input id="university" autoComplete="organization" aria-describedby="study-details-help" placeholder="Type your provider" {...register("university")} /></div>
            <div className="mt-3 space-y-1.5"><Label htmlFor="studyStage">Study stage</Label><Select onValueChange={(value) => setValue("studyStage", value, { shouldValidate: true })}><SelectTrigger id="studyStage" aria-describedby="study-details-help"><SelectValue placeholder="Select your stage" /></SelectTrigger><SelectContent>{STUDY_STAGES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-start gap-3 text-sm leading-5 text-slate-700"><input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700" aria-invalid={!!errors.acceptedPolicies} aria-describedby={errors.acceptedPolicies ? "acceptedPolicies-error" : undefined} {...register("acceptedPolicies")} /><span>I agree to the <Link href="/terms" className="font-medium text-emerald-800 underline">Terms of Service</Link> and acknowledge the <Link href="/privacy" className="font-medium text-emerald-800 underline">Privacy Policy</Link>.</span></label>
            {errors.acceptedPolicies && <p id="acceptedPolicies-error" className="text-xs text-red-700">{errors.acceptedPolicies.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Create account</Button>
          <p className="text-center text-sm text-slate-600">Already registered? <Link href="/sign-in" className="font-medium text-emerald-800 underline">Sign in</Link></p>
          <Link href="/support" className="text-sm font-medium text-emerald-800 underline">Need help?</Link>
        </CardFooter>
      </form>
    </Card>
  );
}
