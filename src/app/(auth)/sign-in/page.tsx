"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    "That confirmation or reset link is invalid, expired or already used. Request a new link and use the latest email.",
  otp_expired: "That link has expired. Request a new confirmation or password-reset email.",
  access_denied: "That link could not be verified. Request a new link or contact support.",
};

function friendlySignInError(message: string): string {
  const lower = message.toLowerCase();
  if (message === "Invalid login credentials") return "Incorrect email or password. Please try again.";
  if (lower.includes("confirm")) return "Confirm your email before signing in. You can request a new confirmation email from the sign-up screen.";
  if (lower.includes("rate") || lower.includes("too many")) return "Sign-in is temporarily rate-limited. Wait a few minutes, then try again.";
  if (lower.includes("locked") || lower.includes("disabled")) return "This account is temporarily unavailable. Contact support for help.";
  return "Sign-in could not be completed. Try again or contact support.";
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setServerError(null);
    try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(friendlySignInError(error.message));
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
    } catch {
      setServerError("Connection unavailable. Please try signing in again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <h1 className="text-2xl font-bold leading-none tracking-tight">Welcome back</h1>
        <CardDescription>Sign in to your DispenseRx account</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {callbackError && !serverError && (
            <div role="alert" aria-live="assertive" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 border border-amber-200">
              {CALLBACK_ERROR_MESSAGES[callbackError] ?? "That link could not be verified. Please try again."}
            </div>
          )}
          {serverError && (
            <div role="alert" aria-live="assertive" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800 border border-red-200">
              {serverError} <Link href="/support" className="font-medium underline">Contact support</Link> if it continues.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "sign-in-email-error" : undefined}
              placeholder="jane@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p id="sign-in-email-error" className="text-xs text-red-700">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-emerald-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "sign-in-password-error" : undefined}
                className="pr-11"
                placeholder="Your password"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="sign-in-password-error" className="text-xs text-red-700">{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-emerald-600 hover:underline"
            >
              Try 2 cases free
            </Link>
          </p>
          <Link href="/support" className="text-sm font-medium text-emerald-800 underline">Need help signing in?</Link>
        </CardFooter>
      </form>
    </Card>
  );
}
