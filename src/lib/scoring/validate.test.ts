import { describe, expect, it } from "vitest";
import { validateDispense, type ValidateInput } from "./validate";
import { getDispenseReadinessIssues } from "./readiness";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { EMPTY_FORM_STATE, type FormState } from "@/components/simulator/state";
import type { Patient } from "@/lib/types/patient";
import type { DrugRow } from "@/lib/types/drug";
import type { PracticeCase } from "@/lib/types/case";
import type { Prescriber } from "@/lib/types/prescriber";

const case1 = STATIC_CASES[0];
const case3 = STATIC_CASES[2];
const case4 = STATIC_CASES[3];

function form(overrides: Partial<FormState> = {}): FormState {
  return { ...EMPTY_FORM_STATE, ...overrides };
}

function mockPatient(overrides: Partial<Patient>): Patient {
  return { id: "test-id", seed_id: null, surname: "", firstname: "", ...overrides };
}

function mockDrug(overrides: Partial<DrugRow>): DrugRow {
  return {
    id: "test-drug-id",
    seed_id: "erythromycin-mayne-cap-250",
    generic_name: "ERYTHROMYCIN",
    brand_name: "MAYNE PHARMA",
    full_display_name: "ERYTHROMYCIN (MAYNE PHARMA) CAP 250MG",
    form: "CAP",
    strength: "250MG",
    pack_size: "25",
    qty_default: 25,
    repeats_default: 1,
    supply_type: "NHS",
    schedule: "S4",
    pbs_code: "1404X",
    ws_cost: 4.78,
    retail_price: 15.34,
    manufacturer_code: "MP",
    manufacturer_full: "Mayne Products Pty Ltd",
    is_generic: false,
    cmi_available: true,
    created_at: "",
    ...overrides,
  };
}

function prescriberFor(caseData: PracticeCase): Prescriber {
  const [surname, firstname] = caseData.doctor.split(",").map((part) => part.trim());
  return {
    id: `prescriber-${caseData.id}`,
    seed_id: null,
    title: "DR",
    surname,
    firstname,
    prescriber_number: caseData.prescriberNo,
    practice_name: null,
    address: null,
    suburb: null,
    state: null,
    postcode: null,
    phone: null,
  };
}

const case1Patient = mockPatient({
  seed_id: "patient-john-smith-abbotsford",
  surname: "SMITH",
  firstname: "JOHN",
});

const case3Patient = mockPatient({
  surname: "HENDERSON",
  firstname: "LIAM",
  medicare_card: "5511-22233-1",
  medicare_valid_to: "12/2022",
  address: "7 MAPLE DRIVE",
  title: "MASTER",
  sex: "M",
  date_of_birth: "12/05/2009",
  suburb: "NORTHCOTE",
  postcode: "3070",
});

const case4Patient = mockPatient({
  seed_id: "patient-david-park-hawthorn",
  surname: "PARK",
  firstname: "DAVID",
});

const case1Drug = mockDrug({
  seed_id: "erythromycin-mayne-cap-250",
  generic_name: "ERYTHROMYCIN",
});

const case3Drug = mockDrug({
  seed_id: "amoxycillin-an-susp-250",
  generic_name: "AMOXYCILLIN",
  brand_name: "AN",
  full_display_name: "AMOXYCILLIN (AN) SUSP 250MG/5ML",
});

const case4Drug = mockDrug({
  seed_id: "temazepam-temaze-tab-10",
  generic_name: "TEMAZEPAM",
  brand_name: "TEMAZE",
  full_display_name: "TEMAZEPAM (TEMAZE) TAB 10MG",
});

function correctInput(
  caseData: PracticeCase,
  selectedPatient: Patient,
  selectedDrug: DrugRow,
  overrides: Partial<ValidateInput> = {}
): ValidateInput {
  return {
    formState: form({
      drug: selectedDrug.full_display_name,
      directions: caseData.directions,
      repeats: caseData.repeats,
      qty: String(caseData.qty),
      pharmacistInitials: "AB",
    }),
    selectedWarnings: new Set(caseData.correctWarnings),
    caseData,
    selectedPatient,
    selectedDrug,
    selectedPrescriber: prescriberFor(caseData),
    decision: caseData.expectedDecision,
    ...overrides,
  };
}

describe("validateDispense", () => {
  it("blocks handover until the essential dispensing workflow is complete", () => {
    expect(getDispenseReadinessIssues({
      formState: form({ pharmacistInitials: "AB" }),
      selectedPatient: null,
      selectedDrug: null,
      selectedPrescriber: null,
      decision: null,
    })).toEqual([
      "patient",
      "prescriber from directory",
      "specific medicine product",
      "directions",
      "quantity",
      "repeats",
      "clinical decision",
    ]);

    expect(getDispenseReadinessIssues({
      formState: form({ directions: "1 cap tds", qty: "25", repeats: "0" }),
      selectedPatient: case1Patient,
      selectedDrug: case1Drug,
      selectedPrescriber: prescriberFor(case1),
      decision: "dispense",
    })).toEqual([]);
  });

  it("passes an accurate, independently completed case", () => {
    const result = validateDispense(correctInput(case1, case1Patient, case1Drug));

    expect(result.pointsEarned).toBe(9);
    expect(result.pointsTotal).toBe(9);
    expect(result.passed).toBe(true);
    expect(result.criticalFailures).toEqual([]);
    expect(result.countsTowardProgress).toBe(true);
  });

  it("cannot pass without a selected drug and product variant", () => {
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, {
        selectedDrug: null,
      })
    );

    expect(result.pointsEarned).toBe(7);
    expect(result.passed).toBe(false);
    expect(result.criticalFailures).toEqual(
      expect.arrayContaining(["drug", "drug_variant"])
    );
  });

  it("requires the matching directory prescriber and prescriber number", () => {
    const wrongPrescriber = {
      ...prescriberFor(case1),
      prescriber_number: "0000000",
    };
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, { selectedPrescriber: wrongPrescriber })
    );

    expect(result.checks.find((check) => check.category === "prescriber")?.passed).toBe(false);
    expect(result.criticalFailures).toContain("prescriber");
    expect(result.passed).toBe(false);
  });

  it("marks revealed-answer attempts as assisted and excludes them from progress", () => {
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, { assisted: true })
    );

    expect(result.passed).toBe(true);
    expect(result.assisted).toBe(true);
    expect(result.countsTowardProgress).toBe(false);
  });

  it("allows one non-critical warning-label mistake but reports it", () => {
    const warnings = new Set(case1.correctWarnings);
    warnings.delete("May cause nausea");
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, { selectedWarnings: warnings })
    );

    expect(result.pointsEarned).toBe(8);
    expect(result.passed).toBe(true);
    expect(result.checks.find((check) => check.category === "warnings")?.passed).toBe(false);
  });

  it("fails even with a high score when the clinical disposition is unsafe", () => {
    const result = validateDispense(
      correctInput(case4, case4Patient, case4Drug, { decision: "dispense" })
    );

    expect(result.pointsEarned).toBe(8);
    expect(result.passed).toBe(false);
    expect(result.criticalFailures).toContain("errors");
  });

  it("passes a problem case when the student holds and contacts the prescriber", () => {
    const result = validateDispense(correctInput(case4, case4Patient, case4Drug));

    expect(result.pointsEarned).toBe(9);
    expect(result.passed).toBe(true);
    expect(result.checks.find((check) => check.category === "errors")?.detail).toContain(
      "Hold and contact"
    );
  });

  it("requires an explicit clinical decision", () => {
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, { decision: null })
    );

    expect(result.pointsEarned).toBe(8);
    expect(result.passed).toBe(false);
    expect(result.criticalFailures).toContain("errors");
  });

  it("accepts complete standard abbreviations", () => {
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, {
        formState: form({ directions: "1 cap tds", repeats: "1", qty: "25" }),
      })
    );

    expect(result.checks.find((check) => check.category === "directions")?.passed).toBe(true);
  });

  it("rejects a direction with an introduced negation", () => {
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, {
        formState: form({
          directions: "Do not take 1 capsule tds",
          repeats: "1",
          qty: "25",
        }),
      })
    );

    expect(result.checks.find((check) => check.category === "directions")?.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it("rejects paediatric directions that omit the duration", () => {
    const result = validateDispense(
      correctInput(case3, case3Patient, case3Drug, {
        formState: form({ directions: "10mL tds", repeats: "0", qty: "300" }),
      })
    );

    expect(result.checks.find((check) => check.category === "directions")?.passed).toBe(false);
  });

  it("accepts a numeric quantity when the expected case includes the unit", () => {
    const result = validateDispense(
      correctInput(case3, case3Patient, case3Drug, {
        formState: form({
          directions: case3.directions,
          repeats: "0",
          qty: "300",
        }),
      })
    );

    expect(result.checks.find((check) => check.category === "quantity")?.passed).toBe(true);
  });

  it("rejects quantities containing unrelated text or a conflicting unit", () => {
    const unrelated = validateDispense(
      correctInput(case3, case3Patient, case3Drug, {
        formState: form({ directions: case3.directions, repeats: "0", qty: "300 bananas" }),
      })
    );
    const conflictingUnit = validateDispense(
      correctInput(case3, case3Patient, case3Drug, {
        formState: form({ directions: case3.directions, repeats: "0", qty: "300mg" }),
      })
    );

    expect(unrelated.checks.find((check) => check.category === "quantity")?.passed).toBe(false);
    expect(conflictingUnit.checks.find((check) => check.category === "quantity")?.passed).toBe(false);
  });

  it("checks all supplied new-patient identity fields for exact values", () => {
    const correct = validateDispense(correctInput(case3, case3Patient, case3Drug));
    const wrongDob = validateDispense(
      correctInput(
        case3,
        { ...case3Patient, date_of_birth: "13/05/2009" },
        case3Drug
      )
    );

    expect(correct.checks.find((check) => check.category === "patient")?.passed).toBe(true);
    expect(wrongDob.checks.find((check) => check.category === "patient")?.passed).toBe(false);
    expect(wrongDob.checks.find((check) => check.category === "patient")?.detail).toContain(
      "date of birth"
    );
  });

  it("allows date of birth to be omitted when adding a new patient", () => {
    const withoutDob = validateDispense(
      correctInput(case3, { ...case3Patient, date_of_birth: null }, case3Drug)
    );

    expect(withoutDob.checks.find((check) => check.category === "patient")?.passed).toBe(true);
  });

  it("rejects the wrong existing patient", () => {
    const wrongPatient = mockPatient({
      seed_id: "patient-margaret-jones-fitzroy",
      surname: "JONES",
      firstname: "MARGARET",
    });
    const result = validateDispense(correctInput(case1, wrongPatient, case1Drug));

    expect(result.checks.find((check) => check.category === "patient")?.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it("reports an extra warning label", () => {
    const warnings = new Set(case1.correctWarnings);
    warnings.add("May cause drowsiness");
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, { selectedWarnings: warnings })
    );

    expect(result.checks.find((check) => check.category === "warnings")?.detail).toContain("Extra:");
  });

  it("distinguishes a correct generic from the wrong product variant", () => {
    const wrongVariant = mockDrug({
      seed_id: "erythromycin-an-cap-250",
      generic_name: "ERYTHROMYCIN",
      brand_name: "AN",
      full_display_name: "ERYTHROMYCIN (AN) CAP 250MG",
    });
    const result = validateDispense(correctInput(case1, case1Patient, wrongVariant));

    expect(result.checks.find((check) => check.category === "drug")?.passed).toBe(true);
    expect(result.checks.find((check) => check.category === "drug_variant")?.passed).toBe(false);
    expect(result.passed).toBe(false);
  });
});
