import type { DispenseResult, CheckResult } from "@/lib/scoring/types";

export type PackFace = "front" | "back" | "left" | "right" | "top" | "bottom";

export interface MedicinePackOption {
  id: string;
  brand: string;
  generic: string;
  strength: string;
  form: string;
  packSize: string;
  colour: "blue" | "coral" | "green" | "purple" | "amber";
}

export interface Case1AssemblySubmission {
  packId: string;
  mainLabelFace: PackFace | null;
  warningLabels: string[];
}

export const CASE1_CORRECT_PACK_ID = "erythromycin-mayne-250-cap-25";

export const CASE1_PACK_OPTIONS: MedicinePackOption[] = [
  {
    id: CASE1_CORRECT_PACK_ID,
    brand: "Mayne Pharma",
    generic: "Erythromycin",
    strength: "250 mg",
    form: "Capsules",
    packSize: "25 capsules",
    colour: "blue",
  },
  {
    id: "erythromycin-mayne-500-tab-20",
    brand: "Mayne Pharma",
    generic: "Erythromycin",
    strength: "500 mg",
    form: "Tablets",
    packSize: "20 tablets",
    colour: "coral",
  },
  {
    id: "erythromycin-generic-250-cap-25",
    brand: "Generic Health",
    generic: "Erythromycin",
    strength: "250 mg",
    form: "Capsules",
    packSize: "25 capsules",
    colour: "green",
  },
  {
    id: "amoxicillin-250-cap-20",
    brand: "Mayne Pharma",
    generic: "Amoxicillin",
    strength: "250 mg",
    form: "Capsules",
    packSize: "20 capsules",
    colour: "purple",
  },
  {
    id: "erythromycin-250-suspension-100",
    brand: "Erythrocare",
    generic: "Erythromycin",
    strength: "250 mg / 5 mL",
    form: "Oral liquid",
    packSize: "100 mL",
    colour: "amber",
  },
];

/**
 * The prototype treats the broad back and right panels as clear label panels.
 * Top and bottom are closures; the front and left carry product, batch and
 * expiry information that should remain readable in this simulated pack.
 */
export const CASE1_CLEAR_LABEL_FACES: PackFace[] = ["back", "right"];

export function addCase1AssemblyChecks(
  result: DispenseResult,
  submission: Case1AssemblySubmission
): DispenseResult {
  const packPassed = submission.packId === CASE1_CORRECT_PACK_ID;
  const placementPassed = submission.mainLabelFace !== null
    && CASE1_CLEAR_LABEL_FACES.includes(submission.mainLabelFace);

  const assemblyChecks: CheckResult[] = [
    {
      category: "assembly_pack",
      label: "Physical medicine pack",
      passed: packPassed,
      isCritical: true,
      expected: "Mayne Pharma erythromycin 250 mg capsules, pack of 25",
      actual: CASE1_PACK_OPTIONS.find((pack) => pack.id === submission.packId)
        ? describePack(CASE1_PACK_OPTIONS.find((pack) => pack.id === submission.packId)!)
        : "No pack selected",
      detail: packPassed
        ? "The selected carton matches the prescribed medicine, manufacturer, strength, dose form and pack size."
        : "The physical carton does not exactly match every prescribed product detail. Check medicine, manufacturer, strength, dose form and pack size.",
    },
    {
      category: "label_placement",
      label: "Dispensing label placement",
      passed: placementPassed,
      isCritical: true,
      expected: "A clear back or right-side panel",
      actual: submission.mainLabelFace ? `${titleCase(submission.mainLabelFace)} face` : "Not applied",
      detail: placementPassed
        ? "The dispensing label is attached to a clear panel without using a closure or the batch/expiry panel."
        : "Move the dispensing label to the clear back or right-side panel so the closure, product details, batch and expiry information remain readable.",
    },
  ];

  const checks = [...result.checks, ...assemblyChecks];
  const criticalFailures = checks
    .filter((check) => check.isCritical && !check.passed)
    .map((check) => check.category);
  const pointsEarned = checks.filter((check) => check.passed).length;
  const pointsTotal = checks.length;
  const passThreshold = result.passThreshold + assemblyChecks.length;

  return {
    ...result,
    checks,
    pointsEarned,
    pointsTotal,
    passThreshold,
    criticalFailures,
    passed: pointsEarned >= passThreshold && criticalFailures.length === 0,
  };
}

export function describePack(pack: MedicinePackOption): string {
  return `${pack.brand} ${pack.generic} ${pack.strength} ${pack.form}, ${pack.packSize}`;
}

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
