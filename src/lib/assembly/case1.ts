import type { DispenseResult, CheckResult } from "@/lib/scoring/types";

export type PackFace = "front" | "back" | "left" | "right" | "top" | "bottom";

export interface StickerPlacement {
  face: PackFace;
  /** Top-left position as a percentage of the visible carton face. */
  x: number;
  y: number;
}

export type StickerKind = "main" | "warning";
export type WarningStickerTone = "blue" | "red" | "orange" | "green" | "purple";

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
  mainLabelPlacement: StickerPlacement | null;
  warningLabels: string[];
  warningPlacements: Record<string, StickerPlacement>;
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

export const CASE1_WARNING_TONES: Record<string, WarningStickerTone> = {
  "Take with food or milk": "blue",
  "Complete the full course": "red",
  "May cause nausea": "orange",
  "May cause drowsiness": "orange",
  "Avoid alcohol": "red",
  "Take with a full glass of water": "blue",
  "Keep refrigerated": "green",
};

export const STICKER_DIMENSIONS = {
  main: { width: 78, height: 40 },
  warning: { width: 48, height: 11 },
} as const;

interface ProtectedZone {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

/** Printed regions that must remain legible on the simulated Case 1 carton. */
const PROTECTED_ZONES: Record<PackFace, ProtectedZone[]> = {
  front: [
    { x: 7, y: 7, width: 87, height: 61, label: "medicine name, strength and dose form" },
    { x: 67, y: 73, width: 27, height: 18, label: "pack size" },
  ],
  back: [
    { x: 7, y: 79, width: 56, height: 16, label: "storage and manufacturer information" },
    { x: 67, y: 76, width: 27, height: 20, label: "barcode and batch panel" },
  ],
  right: [
    { x: 7, y: 80, width: 87, height: 16, label: "batch and expiry information" },
  ],
  left: [
    { x: 7, y: 10, width: 87, height: 82, label: "barcode, batch, expiry and storage information" },
  ],
  top: [
    { x: 0, y: 0, width: 100, height: 100, label: "carton opening and tamper closure" },
  ],
  bottom: [
    { x: 0, y: 0, width: 100, height: 100, label: "carton seal and closure" },
  ],
};

export function warningStickerTone(warning: string): WarningStickerTone {
  return CASE1_WARNING_TONES[warning] ?? "purple";
}

export function evaluateStickerPlacement(
  placement: StickerPlacement | null,
  kind: StickerKind
): { safe: boolean; issue?: string } {
  if (!placement) return { safe: false, issue: "the dispensing label was not applied" };

  const size = STICKER_DIMENSIONS[kind];
  if (
    placement.x < 0
    || placement.y < 0
    || placement.x + size.width > 100
    || placement.y + size.height > 100
  ) {
    return { safe: false, issue: "a label extends beyond the carton face" };
  }

  if (kind === "main" && !CASE1_CLEAR_LABEL_FACES.includes(placement.face)) {
    return {
      safe: false,
      issue: "the main label is not on the broad clear back or right-side panel",
    };
  }

  const collision = PROTECTED_ZONES[placement.face].find((zone) => rectanglesOverlap(
    { ...placement, width: size.width, height: size.height },
    zone
  ));
  if (collision) {
    return { safe: false, issue: `a label covers ${collision.label}` };
  }

  return { safe: true };
}

export function addCase1AssemblyChecks(
  result: DispenseResult,
  submission: Case1AssemblySubmission
): DispenseResult {
  const packPassed = submission.packId === CASE1_CORRECT_PACK_ID;
  const mainPlacement = evaluateStickerPlacement(submission.mainLabelPlacement, "main");
  const warningPlacementIssues = Object.entries(submission.warningPlacements)
    .map(([warning, placement]) => ({ warning, result: evaluateStickerPlacement(placement, "warning") }))
    .filter(({ result: placementResult }) => !placementResult.safe);
  const overlapIssues = stickerOverlapIssues(submission);
  const placementPassed = mainPlacement.safe
    && warningPlacementIssues.length === 0
    && overlapIssues.length === 0;
  const placementIssues = [
    ...(!mainPlacement.safe && mainPlacement.issue ? [mainPlacement.issue] : []),
    ...warningPlacementIssues.map(({ warning, result: placementResult }) =>
      `${warning}: ${placementResult.issue ?? "unsafe position"}`
    ),
    ...overlapIssues,
  ];

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
      expected: "Labels positioned without covering medicine, batch, expiry, barcode or closure information",
      actual: submission.mainLabelPlacement
        ? `${titleCase(submission.mainLabelPlacement.face)} face at ${Math.round(submission.mainLabelPlacement.x)}%, ${Math.round(submission.mainLabelPlacement.y)}%`
        : "Main label not applied",
      detail: placementPassed
        ? "The dispensing and warning labels are fully attached without covering medicine identity, batch, expiry, barcode or closure information."
        : `Reposition the labels so all required carton information remains readable. ${placementIssues.join(" ")}`,
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

function rectanglesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number }
): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

function stickerOverlapIssues(submission: Case1AssemblySubmission): string[] {
  const stickers: Array<{
    label: string;
    kind: StickerKind;
    placement: StickerPlacement;
  }> = [
    ...(submission.mainLabelPlacement
      ? [{ label: "Main dispensing label", kind: "main" as const, placement: submission.mainLabelPlacement }]
      : []),
    ...Object.entries(submission.warningPlacements).map(([warning, placement]) => ({
      label: warning,
      kind: "warning" as const,
      placement,
    })),
  ];
  const issues: string[] = [];

  for (let firstIndex = 0; firstIndex < stickers.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < stickers.length; secondIndex += 1) {
      const first = stickers[firstIndex];
      const second = stickers[secondIndex];
      if (first.placement.face !== second.placement.face) continue;
      const firstSize = STICKER_DIMENSIONS[first.kind];
      const secondSize = STICKER_DIMENSIONS[second.kind];
      if (rectanglesOverlap(
        { ...first.placement, width: firstSize.width, height: firstSize.height },
        { ...second.placement, width: secondSize.width, height: secondSize.height }
      )) {
        issues.push(`${first.label} overlaps ${second.label}.`);
      }
    }
  }

  return issues;
}
