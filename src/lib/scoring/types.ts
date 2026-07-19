export type CheckCategory =
  | "patient"
  | "prescriber"
  | "authority"
  | "drug"
  | "drug_variant"
  | "directions"
  | "quantity"
  | "repeats"
  | "warnings"
  | "assembly_pack"
  | "label_placement"
  | "errors";

export interface CheckResult {
  category: CheckCategory;
  label: string;
  passed: boolean;
  isCritical?: boolean;
  isWarning?: boolean;
  expected?: string;
  actual?: string;
  detail: string;
}

export interface DispenseResult {
  checks: CheckResult[];
  pointsEarned: number;
  pointsTotal: number;
  passed: boolean;
  passThreshold: number;
  criticalFailures: CheckCategory[];
  assisted: boolean;
  countsTowardProgress: boolean;
  tip: string;
}

/** Points needed to pass a single-item prescription. */
export const POINTS_TO_PASS = 7;

/** Checks raised per prescribed item: drug, variant, directions, qty, repeats, warnings. */
export const CHECKS_PER_ITEM = 6;

/**
 * Each extra medicine on a script adds a full set of item checks, so the bar has
 * to rise with it — otherwise a student could botch an entire second medicine
 * and still clear a fixed threshold.
 */
export function dispensePassThreshold(itemCount: number): number {
  return POINTS_TO_PASS + Math.max(0, itemCount - 1) * CHECKS_PER_ITEM;
}
