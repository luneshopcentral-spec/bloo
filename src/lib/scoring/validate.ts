import type { FormState } from "@/components/simulator/state";
import type { PracticeCase } from "@/lib/types/case";
import type { Patient } from "@/lib/types/patient";
import type { DrugRow } from "@/lib/types/drug";
import { expandAbbrevs } from "./abbreviations";
import type { CheckResult, DispenseResult } from "./types";
import { POINTS_TO_PASS } from "./types";

export interface ValidateInput {
  formState: FormState;
  selectedWarnings: Set<string>;
  caseData: PracticeCase;
  selectedPatient?: Patient | null;
  selectedDrug?: DrugRow | null;
}

function extractDigits(s: string): string {
  return (s.match(/\d+/) ?? [""])[0];
}

// First-4-char normalisation handles amoxicillin vs amoxycillin spelling variants.
function normFirst4(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 4);
}

export function validateDispense({
  formState,
  selectedWarnings,
  caseData,
  selectedPatient = null,
  selectedDrug = null,
}: ValidateInput): DispenseResult {
  const checks: CheckResult[] = [];

  // ── 0. Patient ────────────────────────────────────────────────────
  const spec = caseData.patientLookup;
  let patientPassed = false;
  let patientDetail = "";

  if (spec.requiresNewPatient) {
    const exp = spec.expectedNewPatient;
    if (!exp) {
      patientPassed = !!selectedPatient;
      patientDetail = patientPassed ? "New patient added" : "No patient added";
    } else if (!selectedPatient) {
      patientPassed = false;
      patientDetail = `No patient added. Expected new patient: ${exp.surname}, ${exp.firstname}`;
    } else {
      const normStr = (s?: string | null) => (s ?? "").trim().toUpperCase();
      const normDigits = (s?: string | null) => (s ?? "").replace(/\D/g, "");

      const surnameOk  = normStr(selectedPatient.surname)   === normStr(exp.surname);
      const firstnameOk = normStr(selectedPatient.firstname) === normStr(exp.firstname);
      const expAddr = normStr(exp.address);
      const gotAddr = normStr(selectedPatient.address);
      const addressOk =
        !exp.address || gotAddr.includes(expAddr) || expAddr.includes(gotAddr);
      const medicareOk =
        normDigits(selectedPatient.medicare_card) === normDigits(exp.medicareCard);

      const requiredMissing = (
        [
          [!selectedPatient.title?.trim(),         "title"],
          [!selectedPatient.sex?.trim(),            "sex"],
          [!selectedPatient.date_of_birth?.trim(),  "date of birth"],
          [!selectedPatient.suburb?.trim(),         "suburb"],
          [!selectedPatient.postcode?.trim(),       "postcode"],
        ] as [boolean, string][]
      )
        .filter(([missing]) => missing)
        .map(([, field]) => field);

      const mismatches = [
        !surnameOk   && `Surname expected "${exp.surname}", got "${selectedPatient.surname}"`,
        !firstnameOk && `Firstname expected "${exp.firstname}", got "${selectedPatient.firstname}"`,
        !addressOk   && `Address expected "${exp.address}", got "${selectedPatient.address ?? "(empty)"}"`,
        !medicareOk  && `Medicare expected "${exp.medicareCard}", got "${selectedPatient.medicare_card ?? "(empty)"}"`,
      ].filter(Boolean) as string[];

      patientPassed = requiredMissing.length === 0 && mismatches.length === 0;

      if (patientPassed) {
        patientDetail = "New patient entered correctly";
      } else if (requiredMissing.length > 0) {
        patientDetail = `New patient added but missing required fields: ${requiredMissing.join(", ")}`;
      } else {
        patientDetail = `New patient added, but details don't match. ${mismatches.join(". ")}`;
      }
    }
  } else {
    patientPassed =
      !!selectedPatient &&
      selectedPatient.seed_id === spec.existingPatientSeedId;
    patientDetail = patientPassed
      ? "Correct patient selected"
      : `Expected patient with id "${spec.existingPatientSeedId ?? "—"}"${
          selectedPatient
            ? ` — got: ${selectedPatient.surname}, ${selectedPatient.firstname} (id: ${selectedPatient.seed_id ?? "none"})`
            : " — no patient selected"
        }`;
  }

  checks.push({
    category: "patient",
    label: "Patient selected",
    passed: patientPassed,
    detail: patientDetail,
  });

  // ── a. Drug (generic name) ────────────────────────────────────────
  // Matches first word of caseData.drug against selectedDrug.generic_name
  // using 4-char prefix to tolerate amoxicillin/amoxycillin spelling variants.
  const caseFirstWord = caseData.drug.split(" ")[0];
  const drugPassed =
    selectedDrug !== null &&
    normFirst4(selectedDrug.generic_name) === normFirst4(caseFirstWord);

  checks.push({
    category: "drug",
    label: "Drug entered",
    passed: drugPassed,
    expected: caseData.drug,
    actual: selectedDrug?.full_display_name ?? "(no drug selected)",
    detail: selectedDrug === null
      ? "No drug selected — type in the drug field to search the directory"
      : drugPassed
      ? `Correct drug: ${selectedDrug.generic_name}`
      : `Wrong drug. Expected: ${caseData.drug}. You selected: ${selectedDrug.full_display_name}`,
  });

  // ── b. Drug variant (specific brand/generic selection) ────────────
  const variantPassed =
    selectedDrug !== null &&
    selectedDrug.seed_id === caseData.correctDrugSeedId;

  const variantDetail = (() => {
    if (selectedDrug === null)
      return "No drug variant selected — pick a specific product from the directory";
    if (!drugPassed)
      return "Wrong drug selected — see the drug check above";
    if (variantPassed)
      return `Correct product selected: ${selectedDrug.full_display_name}`;
    return `Wrong product. You selected: ${selectedDrug.full_display_name}. Check the prescription for the required brand.`;
  })();

  checks.push({
    category: "drug_variant",
    label: "Drug variant",
    passed: variantPassed,
    detail: variantDetail,
  });

  // ── c. Directions ────────────────────────────────────────────────
  const expectedExpanded = expandAbbrevs(caseData.directions).toLowerCase();
  const studentExpanded  = expandAbbrevs(formState.directions).toLowerCase();
  const expectedWords    = expectedExpanded.split(/\s+/).filter((w) => w.length >= 3);
  const matchCount       = expectedWords.filter((w) => studentExpanded.includes(w)).length;
  const dirPassed        = expectedWords.length > 0 && matchCount / expectedWords.length >= 0.5;
  checks.push({
    category: "directions",
    label: "Directions",
    passed: dirPassed,
    expected: caseData.directions,
    actual: formState.directions || "(empty)",
    detail: dirPassed
      ? "Directions correct (abbreviations accepted)"
      : `Expected: ${caseData.directions}. You entered: ${formState.directions || "(empty)"}`,
  });

  // ── d. Quantity ──────────────────────────────────────────────────
  const qtyExpected = extractDigits(String(caseData.qty));
  const qtyStudent  = extractDigits(formState.qty);
  const qtyPassed   = qtyExpected !== "" && qtyStudent === qtyExpected;
  checks.push({
    category: "quantity",
    label: "Quantity",
    passed: qtyPassed,
    expected: String(caseData.qty),
    actual: formState.qty || "(empty)",
    detail: qtyPassed
      ? "Quantity correct"
      : `Expected: ${caseData.qty}. You entered: ${formState.qty || "(empty)"}`,
  });

  // ── e. Repeats ───────────────────────────────────────────────────
  const rptPassed = formState.repeats.trim() === caseData.repeats;
  checks.push({
    category: "repeats",
    label: "Repeats",
    passed: rptPassed,
    expected: caseData.repeats,
    actual: formState.repeats || "(empty)",
    detail: rptPassed
      ? "Repeats correct"
      : `Expected: ${caseData.repeats}. You entered: ${formState.repeats || "(empty)"}`,
  });

  // ── f. Warning labels ────────────────────────────────────────────
  const correctSet = new Set(caseData.correctWarnings);
  const missing    = caseData.correctWarnings.filter((w) => !selectedWarnings.has(w));
  const extra      = [...selectedWarnings].filter((w) => !correctSet.has(w));
  const warnsPassed = missing.length === 0 && extra.length === 0;
  const warnsDetail = warnsPassed
    ? "All correct labels selected"
    : [
        missing.length ? `Missing: ${missing.join("; ")}` : "",
        extra.length   ? `Extra: ${extra.join("; ")}`     : "",
      ]
        .filter(Boolean)
        .join("\n");
  checks.push({
    category: "warnings",
    label: "Warning labels",
    passed: warnsPassed,
    detail: warnsDetail,
  });

  // ── g. Error detection ───────────────────────────────────────────
  if (caseData.errors.length === 0) {
    checks.push({
      category: "errors",
      label: "Error detection",
      passed: true,
      detail: "No script errors for this case — straightforward dispense",
    });
  } else {
    checks.push({
      category: "errors",
      label: "Error detection",
      passed: false,
      isWarning: true,
      detail: `⚠ Script issue(s) flagged: ${caseData.errors.join(
        "; "
      )} — verify you would NOT dispense this script as written`,
    });
  }

  const pointsEarned = checks.filter((c) => c.passed && !c.isWarning).length;
  const pointsTotal  = 8;

  return {
    checks,
    pointsEarned,
    pointsTotal,
    passed: pointsEarned >= POINTS_TO_PASS,
    passThreshold: POINTS_TO_PASS,
    tip: caseData.tip,
  };
}
