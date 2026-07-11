import { describe, it, expect } from "vitest";
import { validateDispense } from "./validate";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { EMPTY_FORM_STATE } from "@/components/simulator/state";
import type { FormState } from "@/components/simulator/state";
import type { Patient } from "@/lib/types/patient";
import type { DrugRow } from "@/lib/types/drug";

const case1 = STATIC_CASES[0]; // Erythromycin — no errors, existing patient
const case2 = STATIC_CASES[1]; // Warfarin — has errors, existing patient
const case3 = STATIC_CASES[2]; // Amoxicillin — qty "300mL", new patient

function form(overrides: Partial<FormState> = {}): FormState {
  return { ...EMPTY_FORM_STATE, ...overrides };
}

function mockPatient(overrides: Partial<Patient>): Patient {
  return { id: "test-id", seed_id: null, surname: "", firstname: "", ...overrides };
}

function mockDrug(overrides: Partial<DrugRow>): DrugRow {
  return {
    id: "test-drug-id", seed_id: "erythromycin-mayne-cap-250",
    generic_name: "ERYTHROMYCIN", brand_name: "MAYNE PHARMA",
    full_display_name: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG",
    form: "CAP", strength: "250MG", pack_size: "25",
    qty_default: 25, repeats_default: 1,
    supply_type: "NHS", schedule: "S4", pbs_code: "1404X",
    ws_cost: 4.78, retail_price: 15.34,
    manufacturer_code: "MP", manufacturer_full: "Mayne Products Pty Ltd",
    is_generic: false, cmi_available: true, created_at: "",
    ...overrides,
  };
}

const case1Patient = mockPatient({ seed_id: "patient-john-smith-abbotsford", surname: "SMITH",   firstname: "JOHN" });
const case2Patient = mockPatient({ seed_id: "patient-margaret-jones-fitzroy", surname: "JONES",   firstname: "MARGARET" });
const case3Patient = mockPatient({
  surname: "HENDERSON", firstname: "LIAM", medicare_card: "5511-22233-1",
  address: "7 MAPLE DRIVE", title: "MASTER", sex: "M",
  date_of_birth: "12/05/2009", suburb: "NORTHCOTE", postcode: "3070",
});

const case1Drug = mockDrug({ seed_id: "erythromycin-mayne-cap-250", generic_name: "ERYTHROMYCIN" });
const case2Drug = mockDrug({ seed_id: "warfarin-coumadin-tab-5",    generic_name: "WARFARIN",
  brand_name: "COUMADIN", full_display_name: "WARFARIN (COUMADIN) TAB 5MG" });
const case3Drug = mockDrug({ seed_id: "amoxycillin-an-susp-250",    generic_name: "AMOXYCILLIN",
  brand_name: "AN", full_display_name: "AMOXYCILLIN (AN) SUSP 250MG/5ML" });

describe("validateDispense", () => {
  it("all-correct Case 1 (Erythromycin) → 8/8 pass", () => {
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
      selectedDrug: case1Drug,
    });
    expect(result.pointsEarned).toBe(8);
    expect(result.pointsTotal).toBe(8);
    expect(result.passed).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("empty submission on case with errors → 0 points (error check amber)", () => {
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case2,
    });
    expect(result.pointsEarned).toBe(0);
    expect(result.passed).toBe(false);
  });

  it("missing one warning → 7/8", () => {
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
      selectedDrug: case1Drug,
    });
    expect(result.pointsEarned).toBe(7);
    const w = result.checks.find((c) => c.category === "warnings");
    expect(w?.passed).toBe(false);
    expect(w?.detail).toContain("Missing:");
  });

  it("Case 2 (Warfarin) all fields correct — error check is amber → max 7/8", () => {
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
      selectedDrug: case2Drug,
    });
    expect(result.pointsEarned).toBe(7);
    const errCheck = result.checks.find((c) => c.category === "errors");
    expect(errCheck?.isWarning).toBe(true);
    expect(errCheck?.passed).toBe(false);
  });

  it("abbreviated directions '1 cap tds' match expected 'Take ONE capsule tds'", () => {
    const result = validateDispense({
      formState: form({ drug: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG", directions: "1 cap tds", repeats: "1", qty: "25" }),
      selectedWarnings: new Set(case1.correctWarnings),
      caseData: case1,
      selectedPatient: case1Patient,
      selectedDrug: case1Drug,
    });
    const dir = result.checks.find((c) => c.category === "directions");
    expect(dir?.passed).toBe(true);
  });

  it("quantity '300' matches expected '300mL' for Case 3", () => {
    const result = validateDispense({
      formState: form({ drug: "AMOXYCILLIN", directions: "Give 10mL tds for 10 days", repeats: "0", qty: "300" }),
      selectedWarnings: new Set(case3.correctWarnings),
      caseData: case3,
      selectedPatient: case3Patient,
      selectedDrug: case3Drug,
    });
    const qty = result.checks.find((c) => c.category === "quantity");
    expect(qty?.passed).toBe(true);
  });

  it("extra warning causes warnings check to fail with 'Extra:' detail", () => {
    const warnings = new Set(case1.correctWarnings);
    warnings.add("May cause drowsiness");
    const result = validateDispense({
      formState: form({ drug: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG", directions: "Take ONE capsule tds", repeats: "1", qty: "25" }),
      selectedWarnings: warnings,
      caseData: case1,
      selectedPatient: case1Patient,
      selectedDrug: case1Drug,
    });
    const w = result.checks.find((c) => c.category === "warnings");
    expect(w?.passed).toBe(false);
    expect(w?.detail).toContain("Extra:");
  });

  it("wrong drug name fails drug check and includes expected in detail", () => {
    const wrongDrug = mockDrug({
      seed_id: "paracetamol-an-tab-500",
      generic_name: "PARACETAMOL",
      full_display_name: "PARACETAMOL (AN) TAB 500MG",
    });
    const result = validateDispense({
      formState: form({ drug: "PARACETAMOL TAB 500MG", pharmacistInitials: "AB" }),
      selectedWarnings: new Set(),
      caseData: case1,
      selectedPatient: case1Patient,
      selectedDrug: wrongDrug,
    });
    const drug = result.checks.find((c) => c.category === "drug");
    expect(drug?.passed).toBe(false);
    expect(drug?.detail).toContain("Expected:");
  });

  it("Case 3 directions '10ml tds' pass with ≥50% word match after expansion", () => {
    const result = validateDispense({
      formState: form({ drug: "AMOXYCILLIN", directions: "10ml tds", repeats: "0", qty: "300mL" }),
      selectedWarnings: new Set(case3.correctWarnings),
      caseData: case3,
      selectedPatient: case3Patient,
      selectedDrug: case3Drug,
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

  it("new patient case: patient check fails when address does not match", () => {
    const wrongAddr = mockPatient({
      surname: "HENDERSON", firstname: "LIAM", medicare_card: "5511-22233-1",
      address: "99 WRONG STREET", title: "MASTER", sex: "M",
      date_of_birth: "12/05/2009", suburb: "NORTHCOTE", postcode: "3070",
    });
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case3,
      selectedPatient: wrongAddr,
    });
    const pc = result.checks.find((c) => c.category === "patient");
    expect(pc?.passed).toBe(false);
    expect(pc?.detail).toContain("Address");
  });

  // ── Drug variant check tests ──────────────────────────────────────

  it("correct drug + correct variant → drug and drug_variant both pass", () => {
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case1,
      selectedDrug: case1Drug,
    });
    const drug    = result.checks.find((c) => c.category === "drug");
    const variant = result.checks.find((c) => c.category === "drug_variant");
    expect(drug?.passed).toBe(true);
    expect(variant?.passed).toBe(true);
    expect(variant?.detail).toContain("Correct product");
  });

  it("correct drug + wrong variant → drug passes, drug_variant fails", () => {
    const wrongVariant = mockDrug({
      seed_id: "erythromycin-an-cap-250",
      generic_name: "ERYTHROMYCIN",
      brand_name: "AN",
      full_display_name: "ERYTHROMYCIN (AN) CAP 250MG",
    });
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case1,
      selectedDrug: wrongVariant,
    });
    const drug    = result.checks.find((c) => c.category === "drug");
    const variant = result.checks.find((c) => c.category === "drug_variant");
    expect(drug?.passed).toBe(true);    // ERYTHROMYCIN matches
    expect(variant?.passed).toBe(false); // wrong seed_id
    expect(variant?.detail).toContain("ERYTHROMYCIN (AN) CAP 250MG");
  });

  it("completely wrong drug → drug fails, drug_variant says 'see drug check'", () => {
    const wrongDrug = mockDrug({
      seed_id: "paracetamol-an-tab-500",
      generic_name: "PARACETAMOL",
      full_display_name: "PARACETAMOL (AN) TAB 500MG",
    });
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case1,
      selectedDrug: wrongDrug,
    });
    const drug    = result.checks.find((c) => c.category === "drug");
    const variant = result.checks.find((c) => c.category === "drug_variant");
    expect(drug?.passed).toBe(false);
    expect(variant?.passed).toBe(false);
    expect(variant?.detail).toContain("see the drug check above");
  });

  it("no drug selected → drug fails with 'No drug selected', variant fails with 'No drug variant'", () => {
    const result = validateDispense({
      formState: EMPTY_FORM_STATE,
      selectedWarnings: new Set(),
      caseData: case1,
      selectedDrug: null,
    });
    const drug    = result.checks.find((c) => c.category === "drug");
    const variant = result.checks.find((c) => c.category === "drug_variant");
    expect(drug?.passed).toBe(false);
    expect(drug?.detail).toContain("No drug selected");
    expect(variant?.passed).toBe(false);
    expect(variant?.detail).toContain("No drug variant");
  });
});
