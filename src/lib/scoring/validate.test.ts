import { describe, expect, it } from "vitest";
import { validateDispense, type ValidateInput } from "./validate";
import { dispensePassThreshold } from "./types";
import { getDispenseReadinessIssues } from "./readiness";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import {
  EMPTY_ITEM_FORM_STATE,
  emptyFormStateFor,
  type FormState,
  type ItemFormState,
} from "@/components/simulator/state";
import type { Patient } from "@/lib/types/patient";
import type { DrugRow } from "@/lib/types/drug";
import type { PracticeCase } from "@/lib/types/case";
import type { Prescriber } from "@/lib/types/prescriber";

const case1 = STATIC_CASES[0];
const case3 = STATIC_CASES[2];
const case4 = STATIC_CASES[3];
const case7 = STATIC_CASES[6];
const multiItemCase = STATIC_CASES.find((c) => c.items.length > 1)!;

/** Build a form state whose single item carries the given per-item overrides. */
function form(
  overrides: Partial<FormState> & Partial<ItemFormState> = {}
): FormState {
  const { drug, directions, repeats, qty, price, ...scriptOverrides } = overrides;
  const base = emptyFormStateFor(1);
  return {
    ...base,
    ...scriptOverrides,
    items: [
      {
        ...EMPTY_ITEM_FORM_STATE,
        ...(drug !== undefined ? { drug } : {}),
        ...(directions !== undefined ? { directions } : {}),
        ...(repeats !== undefined ? { repeats } : {}),
        ...(qty !== undefined ? { qty } : {}),
        ...(price !== undefined ? { price } : {}),
      },
    ],
  };
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
  const item = caseData.items[0];
  return {
    formState: form({
      drug: selectedDrug.full_display_name,
      directions: item.directions,
      repeats: item.repeats,
      qty: String(item.qty),
      pharmacistInitials: "AB",
    }),
    selectedWarnings: [new Set(item.correctWarnings)],
    caseData,
    selectedPatient,
    selectedDrugs: [selectedDrug],
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
      selectedDrugs: [null],
      selectedPrescriber: null,
      decision: null,
      caseData: case1,
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
      selectedDrugs: [case1Drug],
      selectedPrescriber: prescriberFor(case1),
      decision: "dispense",
      caseData: case1,
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

  it("requires and marks the authority number for controlled authority cases", () => {
    const controlledDrug = mockDrug({
      seed_id: case7.items[0].correctDrugSeedId,
      generic_name: "OXYCODONE",
      full_display_name: case7.items[0].drug,
      schedule: "S8",
    });
    const controlledPatient = mockPatient({
      seed_id: case7.patientLookup.existingPatientSeedId,
      surname: "MORALES",
      firstname: "PETER",
    });
    const base = correctInput(case7, controlledPatient, controlledDrug);

    expect(getDispenseReadinessIssues({
      formState: base.formState,
      selectedPatient: controlledPatient,
      selectedDrugs: [controlledDrug],
      selectedPrescriber: prescriberFor(case7),
      decision: case7.expectedDecision,
      caseData: case7,
    })).toContain("authority number from the prescription");

    const incorrect = validateDispense({
      ...base,
      formState: { ...base.formState, authorityNumber: "H0000XX" },
    });
    expect(incorrect.criticalFailures).toContain("authority");

    const correct = validateDispense({
      ...base,
      formState: { ...base.formState, authorityNumber: case7.authority?.number ?? "" },
    });
    expect(correct.checks.find((check) => check.category === "authority")?.passed).toBe(true);
  });

  it("cannot pass without a selected drug and product variant", () => {
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, {
        selectedDrugs: [null],
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
    const warnings = new Set(case1.items[0].correctWarnings);
    warnings.delete("May cause nausea");
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, { selectedWarnings: [warnings] })
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
          directions: case3.items[0].directions,
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
        formState: form({ directions: case3.items[0].directions, repeats: "0", qty: "300 bananas" }),
      })
    );
    const conflictingUnit = validateDispense(
      correctInput(case3, case3Patient, case3Drug, {
        formState: form({ directions: case3.items[0].directions, repeats: "0", qty: "300mg" }),
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
    const warnings = new Set(case1.items[0].correctWarnings);
    warnings.add("May cause drowsiness");
    const result = validateDispense(
      correctInput(case1, case1Patient, case1Drug, { selectedWarnings: [warnings] })
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

describe("prescriptions ordering more than one medicine", () => {
  const multiPatient = mockPatient({
    seed_id: multiItemCase.patientLookup.existingPatientSeedId,
    surname: "CARRUTHERS",
    firstname: "CHRISTOPHER",
  });

  function drugForItem(index: number): DrugRow {
    const item = multiItemCase.items[index];
    return mockDrug({
      seed_id: item.correctDrugSeedId,
      generic_name: item.drug.split(" ")[0],
      full_display_name: item.drug,
    });
  }

  function multiInput(overrides: Partial<ValidateInput> = {}): ValidateInput {
    return {
      formState: {
        ...emptyFormStateFor(multiItemCase.items.length),
        pharmacistInitials: "AB",
        authorityNumber: multiItemCase.authority?.number ?? "",
        items: multiItemCase.items.map((item) => ({
          drug: item.drug,
          directions: item.directions,
          repeats: item.repeats,
          qty: String(item.qty),
          price: "",
        })),
      },
      selectedWarnings: multiItemCase.items.map((item) => new Set(item.correctWarnings)),
      caseData: multiItemCase,
      selectedPatient: multiPatient,
      selectedDrugs: multiItemCase.items.map((_item, index) => drugForItem(index)),
      selectedPrescriber: prescriberFor(multiItemCase),
      decision: multiItemCase.expectedDecision,
      ...overrides,
    };
  }

  it("checks every prescribed item and labels which one each check belongs to", () => {
    const result = validateDispense(multiInput());

    expect(result.passed).toBe(true);
    expect(result.criticalFailures).toEqual([]);
    // Six checks per item, plus patient, prescriber, authority and decision.
    expect(result.pointsTotal).toBe(multiItemCase.items.length * 6 + 4);
    expect(result.checks.filter((check) => check.category === "drug")).toHaveLength(2);
    expect(result.checks.some((check) => check.label.startsWith("Item 1: "))).toBe(true);
    expect(result.checks.some((check) => check.label.startsWith("Item 2: "))).toBe(true);
  });

  it("fails the attempt when only the second item is wrong", () => {
    const result = validateDispense(
      multiInput({
        selectedDrugs: [drugForItem(0), null],
      })
    );

    expect(result.passed).toBe(false);
    expect(result.criticalFailures).toEqual(expect.arrayContaining(["drug", "drug_variant"]));
    // The first item's own checks must still pass — failures are per item.
    expect(result.checks.find((check) => check.label === "Item 1: Drug entered")?.passed).toBe(true);
    expect(result.checks.find((check) => check.label === "Item 2: Drug entered")?.passed).toBe(false);
  });

  it("raises the pass mark for each extra medicine on the script", () => {
    // A fixed threshold would let a student botch a whole second medicine and
    // still clear the bar on the strength of the first.
    expect(dispensePassThreshold(1)).toBe(7);
    expect(dispensePassThreshold(2)).toBe(13);
    expect(validateDispense(multiInput()).passThreshold).toBe(13);
    expect(validateDispense(correctInput(case1, case1Patient, case1Drug)).passThreshold).toBe(7);
  });

  it("does not let a perfect first item carry an unfilled second item", () => {
    const base = multiInput();
    const result = validateDispense({
      ...base,
      formState: {
        ...base.formState,
        items: [base.formState.items[0], { drug: "", directions: "", repeats: "", qty: "", price: "" }],
      },
      selectedDrugs: [drugForItem(0), null],
      selectedWarnings: [new Set(multiItemCase.items[0].correctWarnings), new Set()],
    });

    expect(result.pointsEarned).toBeLessThan(result.passThreshold);
    expect(result.passed).toBe(false);
  });

  it("names the item that is still incomplete before handover", () => {
    const issues = getDispenseReadinessIssues({
      formState: {
        ...emptyFormStateFor(multiItemCase.items.length),
        authorityNumber: multiItemCase.authority?.number ?? "",
        items: [
          {
            drug: multiItemCase.items[0].drug,
            directions: multiItemCase.items[0].directions,
            repeats: multiItemCase.items[0].repeats,
            qty: String(multiItemCase.items[0].qty),
            price: "",
          },
          { drug: "", directions: "", repeats: "", qty: "", price: "" },
        ],
      },
      selectedPatient: multiPatient,
      selectedDrugs: [drugForItem(0), null],
      selectedPrescriber: prescriberFor(multiItemCase),
      decision: multiItemCase.expectedDecision,
      caseData: multiItemCase,
    });

    expect(issues).toEqual([
      "specific medicine product for item 2",
      "directions for item 2",
      "quantity for item 2",
      "repeats for item 2",
    ]);
  });
});
