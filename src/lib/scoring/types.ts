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

export const POINTS_TO_PASS = 7;
