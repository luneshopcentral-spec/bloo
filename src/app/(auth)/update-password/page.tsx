"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  password: z.string().min(8, "Use at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

type FormValues = z.infer<typeof schema>;

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(Boolean(user));
      setCheckingSession(false);
    });
  }, []);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setLoading(false);
    if (error) {
      setServerError(error.message.toLowerCase().includes("session")
        ? "This reset link is invalid, expired or already used. Request a new password reset email."
        : "The password could not be updated. Request a new link or contact support.");
      return;
    }
    setUpdated(true);
  }

  if (checkingSession) return <Card className="w-full max-w-md shadow-lg"><CardContent className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-600" aria-label="Checking reset link" /></CardContent></Card>;

  if (!hasSession) return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader><CardTitle>Reset link unavailable</CardTitle><CardDescription>This link is invalid, expired or already used.</CardDescription></CardHeader>
      <CardFooter className="flex-col gap-3"><Button className="w-full" asChild><Link href="/forgot-password">Request a new link</Link></Button><Link href="/support" className="text-sm font-medium text-emerald-800 underline">Contact support</Link></CardFooter>
    </Card>
  );

  if (updated) return (
    <Card className="w-full max-w-md shadow-lg"><CardContent className="flex flex-col items-center gap-4 py-10 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-700" aria-hidden="true" /><div><h1 className="text-lg font-bold text-slate-900">Password updated</h1><p className="mt-2 text-sm text-slate-600">Your new password is ready to use.</p></div><Button type="button" onClick={() => { router.push("/dashboard"); router.refresh(); }}>Continue to dashboard</Button></CardContent></Card>
  );

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader><h1 className="text-2xl font-semibold leading-none tracking-tight">Choose a new password</h1><CardDescription>Enter and confirm the new password for your account.</CardDescription></CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {serverError && <div role="alert" aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError} <Link href="/support" className="font-medium underline">Contact support</Link>.</div>}
          <div className="space-y-1.5"><Label htmlFor="new-password">New password</Label><div className="relative"><Input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required aria-invalid={!!errors.password} aria-describedby={errors.password ? "new-password-error" : "new-password-help"} className="pr-11" {...register("password")} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-slate-600 hover:bg-slate-100" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{errors.password ? <p id="new-password-error" className="text-xs text-red-700">{errors.password.message}</p> : <p id="new-password-help" className="text-xs text-slate-600">Use at least 8 characters.</p>}</div>
          <div className="space-y-1.5"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined} {...register("confirmPassword")} />{errors.confirmPassword && <p id="confirm-password-error" className="text-xs text-red-700">{errors.confirmPassword.message}</p>}</div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4"><Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Update password</Button><Link href="/sign-in" className="text-sm font-medium text-emerald-800 underline">Back to sign in</Link></CardFooter>
      </form>
    </Card>
  );
}
