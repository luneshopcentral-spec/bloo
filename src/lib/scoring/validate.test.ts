import { describe, it, expect } from "vitest";
import { validateDispense } from "./validate";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { EMPTY_FORM_STATE } from "@/components/simulator/state";
import type { FormState } from "@/components/simulator/state";
import type { Patient } from "@/lib/types/patient";

const case1 = STATIC_CASES[0]; // Erythromycin — errors: [], existing patient
const case2 = STATIC_CASES[1]; // Warfarin — has errors, existing patient
const case3 = STATIC_CASES[2]; // Amoxicillin — qty "300mL", new patient

function form(overrides: Partial<FormState> = {}): FormState {
  return { ...EMPTY_FORM_STATE, ...overrides };
}

function mockPatient(overrides: Partial<Patient>): Patient {
  return {
    id: "test-id",
    seed_id: null,
    surname: "",
    firstname: "",
    ...overrides,
  };
}

const case1Patient = mockPatient({ seed_id: "patient-john-smith-abbotsford", surname: "SMITH", firstname: "JOHN" });
const case2Patient = mockPatient({ seed_id: "patient-margaret-jones-fitzroy", surname: "JONES", firstname: "MARGARET" });
const case3Patient = mockPatient({ surname: "HENDERSON", firstname: "LIAM", medicare_card: "5511-22233-1" });

describe("validateDispense", () => {
  it("all-correct Case 1 (Erythromycin) → 7/7 pass", () => {
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
      selectedPatient: case1Patient,
    });
    expect(result.pointsEarned).toBe(7);
    expect(result.pointsTotal).toBe(7);
    expect(result.passed).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("empty submission on case with errors → 0 points (error check is amber, patient check fails)", () => {
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case2,
    });
    expect(result.pointsEarned).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("missing one warning → 6/7", () => {
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
      selectedPatient: case1Patient,
    });
    expect(result.pointsEarned).toBe(6);
    const w = result.checks.find((c) => c.category === "warnings");
    expect(w?.passed).toBe(false);
    expect(w?.detail).toContain("Missing:");
  });

  it("Case 2 (Warfarin) all fields correct — error check is amber warning → max 6/7", () => {
    const result = validateDispense({
      formState: form({
        drug: "WARFARIN (COUMADIN) TAB 5MG",
        directions: "Take as directed",
        repeats: "5",
        qty: "30",
      }),
      selectedWarnings: new Set(case2.correctWarnings),
      caseData: case2,
      selectedPatient: case2Patient,
    });
    expect(result.pointsEarned).toBe(6);
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
      selectedPatient: case1Patient,
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
      selectedPatient: case3Patient,
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
      selectedPatient: case1Patient,
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
      selectedPatient: case1Patient,
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
      selectedPatient: case3Patient,
    });
    const dir = result.checks.find((c) => c.category === "directions");
    expect(dir?.passed).toBe(true);
  });

  // ── Patient check tests ───────────────────────────────────────────

  it("patient check passes when selectedPatient.seed_id matches existingPatientSeedId", () => {
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case1,
      selectedPatient: case1Patient,
    });
    const pc = result.checks.find((c) => c.category === "patient");
    expect(pc?.passed).toBe(true);
    expect(pc?.detail).toContain("Correct patient selected");
  });

  it("patient check fails when selectedPatient has wrong seed_id", () => {
    const wrongPatient = mockPatient({ seed_id: "patient-margaret-jones-fitzroy", surname: "JONES", firstname: "MARGARET" });
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case1,
      selectedPatient: wrongPatient,
    });
    const pc = result.checks.find((c) => c.category === "patient");
    expect(pc?.passed).toBe(false);
  });

  it("new patient case: patient check passes when selectedPatient fields match expectedNewPatient", () => {
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case3,
      selectedPatient: case3Patient,
    });
    const pc = result.checks.find((c) => c.category === "patient");
    expect(pc?.passed).toBe(true);
    expect(pc?.detail).toContain("correctly");
  });

  it("new patient case: patient check fails when medicare card does not match", () => {
    const wrongMcare = mockPatient({ surname: "HENDERSON", firstname: "LIAM", medicare_card: "9999-00000-0" });
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case3,
      selectedPatient: wrongMcare,
    });
    const pc = result.checks.find((c) => c.category === "patient");
    expect(pc?.passed).toBe(false);
  });
});
