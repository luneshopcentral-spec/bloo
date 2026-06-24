import { describe, it, expect } from "vitest";
import { validateDispense } from "./validate";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { EMPTY_FORM_STATE } from "@/components/simulator/state";
import type { FormState } from "@/components/simulator/state";

const case1 = STATIC_CASES[0]; // Erythromycin — errors: []
const case2 = STATIC_CASES[1]; // Warfarin — has errors
const case3 = STATIC_CASES[2]; // Amoxicillin — qty "300mL"

function form(overrides: Partial<FormState> = {}): FormState {
  return { ...EMPTY_FORM_STATE, ...overrides };
}

describe("validateDispense", () => {
  it("all-correct Case 1 (Erythromycin) → 6/6 pass", () => {
    const result = validateDispense({
      formState: form({
        drug: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG",
        directions: "Take ONE capsule tds",
        repeats: "1",
        qty: "25",
        price: "20.86",
        pharmacistInitials: "AB",
      }),
      selectedWarnings: new Set(case1.correctWarnings),
      caseData: case1,
    });
    expect(result.pointsEarned).toBe(6);
    expect(result.pointsTotal).toBe(6);
    expect(result.passed).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("empty submission on case with errors → 0 points (error check is amber, not a pass)", () => {
    // case2 has errors, so error-detection check is isWarning=true and earns 0 points.
    // All other checks fail on empty input → 0/6 total.
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case2,
    });
    expect(result.pointsEarned).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("missing one warning → 5/6", () => {
    const warnings = new Set(case1.correctWarnings);
    warnings.delete("May cause nausea");
    const result = validateDispense({
      formState: form({
        drug: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG",
        directions: "Take ONE capsule tds",
        repeats: "1",
        qty: "25",
      }),
      selectedWarnings: warnings,
      caseData: case1,
    });
    expect(result.pointsEarned).toBe(5);
    const w = result.checks.find((c) => c.category === "warnings");
    expect(w?.passed).toBe(false);
    expect(w?.detail).toContain("Missing:");
  });

  it("Case 2 (Warfarin) all fields correct — error check is amber warning → max 5/6", () => {
    const result = validateDispense({
      formState: form({
        drug: "WARFARIN (COUMADIN) TAB 5MG",
        directions: "Take as directed",
        repeats: "5",
        qty: "30",
      }),
      selectedWarnings: new Set(case2.correctWarnings),
      caseData: case2,
    });
    expect(result.pointsEarned).toBe(5);
    const errCheck = result.checks.find((c) => c.category === "errors");
    expect(errCheck?.isWarning).toBe(true);
    expect(errCheck?.passed).toBe(false);
  });

  it("abbreviated directions '1 cap tds' match expected 'Take ONE capsule tds'", () => {
    const result = validateDispense({
      formState: form({
        drug: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG",
        directions: "1 cap tds",
        repeats: "1",
        qty: "25",
      }),
      selectedWarnings: new Set(case1.correctWarnings),
      caseData: case1,
    });
    const dir = result.checks.find((c) => c.category === "directions");
    expect(dir?.passed).toBe(true);
  });

  it("quantity '300' matches expected '300mL' for Case 3", () => {
    const result = validateDispense({
      formState: form({
        drug: "AMOXICILLIN 250MG/5ML ORAL SUSPENSION",
        directions: "Give 10mL tds for 10 days",
        repeats: "0",
        qty: "300",
      }),
      selectedWarnings: new Set(case3.correctWarnings),
      caseData: case3,
    });
    const qty = result.checks.find((c) => c.category === "quantity");
    expect(qty?.passed).toBe(true);
  });

  it("extra warning causes warnings check to fail with 'Extra:' detail", () => {
    const warnings = new Set(case1.correctWarnings);
    warnings.add("May cause drowsiness"); // not in case1
    const result = validateDispense({
      formState: form({
        drug: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG",
        directions: "Take ONE capsule tds",
        repeats: "1",
        qty: "25",
      }),
      selectedWarnings: warnings,
      caseData: case1,
    });
    const w = result.checks.find((c) => c.category === "warnings");
    expect(w?.passed).toBe(false);
    expect(w?.detail).toContain("Extra:");
  });

  it("wrong drug name fails drug check and includes expected in detail", () => {
    const result = validateDispense({
      formState: form({ drug: "AMOXICILLIN TAB 500MG", pharmacistInitials: "AB" }),
      selectedWarnings: new Set(),
      caseData: case1,
    });
    const drug = result.checks.find((c) => c.category === "drug");
    expect(drug?.passed).toBe(false);
    expect(drug?.detail).toContain("Expected:");
  });

  it("Case 3 directions '10ml tds' pass with ≥50% word match after expansion", () => {
    const result = validateDispense({
      formState: form({
        drug: "AMOXICILLIN 250MG/5ML ORAL SUSPENSION",
        directions: "10ml tds",
        repeats: "0",
        qty: "300mL",
      }),
      selectedWarnings: new Set(case3.correctWarnings),
      caseData: case3,
    });
    const dir = result.checks.find((c) => c.category === "directions");
    expect(dir?.passed).toBe(true);
  });
});
