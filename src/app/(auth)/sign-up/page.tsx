"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { STATIC_CASES } from "@/lib/cases/static-cases";

const FREE_CASE_COUNT = STATIC_CASES.filter((c) => c.isFree).length;

const UNIVERSITIES = [
  "Monash University",
  "University of Sydney",
  "University of Queensland",
  "University of South Australia",
  "Curtin University",
  "RMIT University",
  "La Trobe University",
  "Charles Sturt University",
  "University of Newcastle",
  "James Cook University",
  "Griffith University",
  "Other",
];

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  university: z.string().optional(),
  yearOfStudy: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SignUpPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setServerError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: values.fullName,
          university: values.university ?? null,
          year_of_study: values.yearOfStudy
            ? parseInt(values.yearOfStudy, 10)
            : null,
        },
      },
    });

    if (error) {
      setServerError(error.message);
      setLoading(false);
      return;
    }

    // With email confirmation on, Supabase returns no session — the user must
    // confirm via email before signing in. Show the check-your-email screen
    // instead of pushing to a dashboard they cannot yet reach.
    if (!data.session) {
      setConfirmationEmail(values.email);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  if (confirmationEmail) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            Confirm your address to activate your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            We&rsquo;ve sent a confirmation link to{" "}
            <span className="font-medium text-slate-900">{confirmationEmail}</span>.
            Click it to finish setting up your account, then sign in.
          </p>
          <p className="text-sm text-slate-500">
            Didn&rsquo;t get it? Check your spam folder, or wait a minute and try again.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/sign-in">Go to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
        <CardDescription>
          Start with {FREE_CASE_COUNT} free practice cases — no card required
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              placeholder="Jane Smith"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-xs text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="university">
              University{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Select onValueChange={(v) => setValue("university", v)}>
              <SelectTrigger id="university">
                <SelectValue placeholder="Select your university" />
              </SelectTrigger>
              <SelectContent>
                {UNIVERSITIES.map((uni) => (
                  <SelectItem key={uni} value={uni}>
                    {uni}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="yearOfStudy">
              Year of study{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Select onValueChange={(v) => setValue("yearOfStudy", v)}>
              <SelectTrigger id="yearOfStudy">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4"].map((y) => (
                  <SelectItem key={y} value={y}>
                    Year {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-emerald-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
