import type { AttemptResult } from "@/lib/conversation/types";
import type { PracticeMode } from "@/lib/practice/modes";
import type { Json } from "@/lib/types/database";
import type { Database } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";

export interface PersistAttemptInput {
  caseId: string;
  caseVersion: string;
  mode: PracticeMode;
  result: AttemptResult;
  countsTowardProgress: boolean;
}

export interface PersistAttemptResult {
  saved: boolean;
  reason?: "not_signed_in" | "schema_update_required" | "database_error";
}

function competencyMap(result: AttemptResult): Record<string, { passed: number; total: number }> {
  const competencies: Record<string, { passed: number; total: number }> = {};
  for (const check of result.dispense.checks) {
    competencies[`dispensing:${check.category}`] = {
      passed: check.passed ? 1 : 0,
      total: 1,
    };
  }
  for (const check of result.counselling.checks) {
    const key = `counselling:${check.category}`;
    const current = competencies[key] ?? { passed: 0, total: 0 };
    competencies[key] = {
      passed: current.passed + (check.passed ? 1 : 0),
      total: current.total + 1,
    };
  }
  return competencies;
}

export async function persistCompletedAttempt({
  caseId,
  caseVersion,
  mode,
  result,
  countsTowardProgress,
}: PersistAttemptInput): Promise<PersistAttemptResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false, reason: "not_signed_in" };

  const score = result.dispense.pointsEarned + result.counselling.pointsEarned;
  const maxScore = result.dispense.pointsTotal + result.counselling.pointsTotal;
  const criticalFailures = [
    ...result.dispense.criticalFailures.map((failure) => `dispensing:${failure}`),
    ...result.counselling.criticalFailures.map((failure) => `counselling:${failure}`),
  ];
  const details = JSON.parse(JSON.stringify({
    dispense: result.dispense,
    counselling: result.counselling,
  })) as Json;

  const attemptRow: Database["public"]["Tables"]["attempts"]["Insert"] = {
    user_id: user.id,
    case_id: caseId,
    case_version: caseVersion,
    mode,
    score,
    max_score: maxScore,
    passed: result.passed,
    assisted: result.assisted,
    counts_toward_progress: countsTowardProgress,
    critical_failures: criticalFailures,
    competencies: competencyMap(result) as unknown as Json,
    details,
  };
  // The installed Supabase client resolves the hand-maintained schema's insert
  // overload to never[]. The runtime API accepts an array and the payload is
  // still checked against Database above.
  const { error } = await supabase.from("attempts").insert([attemptRow] as never[]);

  if (error) {
    const schemaUpdateRequired = /case_id|case_version|counts_toward_progress|mode|uuid/i.test(error.message);
    return {
      saved: false,
      reason: schemaUpdateRequired ? "schema_update_required" : "database_error",
    };
  }

  if (countsTowardProgress) {
    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("trial_cases_used, has_paid")
      .eq("id", user.id)
      .single();
    const profile = rawProfile as Pick<
      Database["public"]["Tables"]["profiles"]["Row"],
      "trial_cases_used" | "has_paid"
    > | null;
    if (profile && !profile.has_paid) {
      await supabase
        .from("profiles")
        .update({ trial_cases_used: profile.trial_cases_used + 1 } as never)
        .eq("id", user.id);
    }
  }

  return { saved: true };
}
