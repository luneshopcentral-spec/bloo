import type { FormState } from "@/components/simulator/state";
import type { DispenseDecision, PracticeCase } from "@/lib/types/case";
import type { Patient } from "@/lib/types/patient";
import type { DrugRow } from "@/lib/types/drug";
import type { Prescriber } from "@/lib/types/prescriber";
import { formatPrescriberName } from "@/lib/types/prescriber";
import { expandAbbrevs } from "./abbreviations";
import type { CheckResult, DispenseResult } from "./types";
import { POINTS_TO_PASS } from "./types";

export interface ValidateInput {
  formState: FormState;
  selectedWarnings: Set<string>;
  caseData: PracticeCase;
  selectedPatient?: Patient | null;
  selectedDrug?: DrugRow | null;
  selectedPrescriber?: Prescriber | null;
  decision?: DispenseDecision | null;
  assisted?: boolean;
}

interface ParsedQuantity {
  amount: string;
  unit: string;
}

function parseQuantity(value: string): ParsedQuantity | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) return null;
  const unit = (match[2] ?? "").toLowerCase();
  return {
    amount: String(Number(match[1])),
    unit: unit === "millilitres" || unit === "milliliters" ? "ml" : unit,
  };
}

const NUMBER_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
};

function directionTokens(value: string): string[] {
  const expanded = expandAbbrevs(value).toLowerCase();
  return expanded
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => NUMBER_WORDS[token] ?? token);
}

function hasNegation(value: string): boolean {
  return /\b(?:no|not|never|avoid|without|dont|do not)\b/i.test(value);
}

function directionsMatch(expected: string, actual: string): boolean {
  if (!actual.trim()) return false;
  if (hasNegation(expected) !== hasNegation(actual)) return false;

  const expectedTokens = directionTokens(expected);
  const actualTokens = new Set(directionTokens(actual));
  if (expectedTokens.length === 0) return false;

  const matched = expectedTokens.filter((token) => actualTokens.has(token)).length;
  return matched / expectedTokens.length >= 0.8;
}

// First-4-char normalisation handles amoxicillin vs amoxycillin spelling variants.
function normFirst4(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "").slice(0, 4);
}

function normComparable(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateDispense({
  formState,
  selectedWarnings,
  caseData,
  selectedPatient = null,
  selectedDrug = null,
  selectedPrescriber = null,
  decision = null,
  assisted = false,
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

      const expectedFieldMatches = [
        ["title", exp.title, selectedPatient.title],
        ["sex", exp.sex, selectedPatient.sex],
        ["suburb", exp.suburb, selectedPatient.suburb],
        ["postcode", exp.postcode, selectedPatient.postcode],
        ["Medicare valid-to", exp.medicareValidTo, selectedPatient.medicare_valid_to],
        ["concession type", exp.concessionType, selectedPatient.concession_type],
        ["concession number", exp.concessionNumber, selectedPatient.concession_number],
      ] as const;

      const requiredMissing = (
        [
          [!selectedPatient.title?.trim(),         "title"],
          [!selectedPatient.sex?.trim(),            "sex"],
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
        ...expectedFieldMatches.map(([label, expected, actual]) =>
          expected && normStr(actual) !== normStr(expected)
            ? `${label} expected "${expected}", got "${actual ?? "(empty)"}"`
            : false
        ),
        selectedPatient.date_of_birth?.trim() && exp.dateOfBirth &&
          normStr(selectedPatient.date_of_birth) !== normStr(exp.dateOfBirth)
          ? `date of birth expected "${exp.dateOfBirth}", got "${selectedPatient.date_of_birth}"`
          : false,
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
    isCritical: true,
    detail: patientDetail,
  });

  // ── a. Drug (generic name) ────────────────────────────────────────
  // Matches first word of caseData.drug against selectedDrug.generic_name
  // using 4-char prefix to tolerate amoxicillin/amoxycillin spelling variants.
  const selectedPrescriberName = selectedPrescriber ? formatPrescriberName(selectedPrescriber) : "";
  const expectedPrescriberNo = caseData.expectedPrescriberNo ?? caseData.prescriberNo;
  const prescriberPassed =
    selectedPrescriber !== null &&
    normComparable(selectedPrescriberName) === normComparable(caseData.doctor) &&
    selectedPrescriber.prescriber_number.replace(/\D/g, "") === expectedPrescriberNo.replace(/\D/g, "");
  checks.push({
    category: "prescriber",
    label: "Prescriber selected",
    passed: prescriberPassed,
    isCritical: true,
    expected: `${caseData.doctor} · ${expectedPrescriberNo}`,
    actual: selectedPrescriber
      ? `${selectedPrescriberName} · ${selectedPrescriber.prescriber_number}`
      : "No directory prescriber selected",
    detail: prescriberPassed
      ? "Correct prescriber and prescriber number selected from the directory."
      : selectedPrescriber
        ? "Wrong prescriber. Check both the name and number against the prescription."
        : "Select the prescriber from the directory before dispensing.",
  });

  if (caseData.authority?.required) {
    const authorityPassed =
      normComparable(formState.authorityNumber) === normComparable(caseData.authority.number);
    checks.push({
      category: "authority",
      label: caseData.authority.type === "streamlined"
        ? "Streamlined authority code"
        : "PBS authority approval number",
      passed: authorityPassed,
      isCritical: true,
      expected: caseData.authority.number,
      actual: formState.authorityNumber || "(empty)",
      detail: authorityPassed
        ? "Authority details were transcribed correctly from the prescription."
        : `Expected ${caseData.authority.number}; entered ${formState.authorityNumber || "nothing"}. An authority item cannot proceed as a PBS supply without the applicable code or approval number.`,
    });
  }

  // The prescription may be written by generic or brand name (e.g. "DUROGESIC"
  // with generic_name FENTANYL), so accept a first-word match against either.
  const caseFirstWord = caseData.drug.split(" ")[0];
  const drugPassed =
    selectedDrug !== null &&
    [selectedDrug.generic_name, selectedDrug.brand_name ?? "", selectedDrug.full_display_name]
      .some((name) => name && normFirst4(name) === normFirst4(caseFirstWord));

  checks.push({
    category: "drug",
    label: "Drug entered",
    passed: drugPassed,
    isCritical: true,
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
    label: "Brand / generic product",
    passed: variantPassed,
    isCritical: true,
    detail: variantDetail,
  });

  // ── c. Directions ────────────────────────────────────────────────
  const dirPassed = directionsMatch(caseData.directions, formState.directions);
  checks.push({
    category: "directions",
    label: "Directions",
    passed: dirPassed,
    isCritical: true,
    expected: caseData.directions,
    actual: formState.directions || "(empty)",
    detail: dirPassed
      ? "Directions correct (abbreviations accepted)"
      : `Expected: ${caseData.directions}. You entered: ${formState.directions || "(empty)"}`,
  });

  // ── d. Quantity ──────────────────────────────────────────────────
  const qtyExpected = parseQuantity(String(caseData.qty));
  const qtyStudent  = parseQuantity(formState.qty);
  const qtyPassed =
    qtyExpected !== null &&
    qtyStudent !== null &&
    qtyStudent.amount === qtyExpected.amount &&
    (!qtyStudent.unit || !qtyExpected.unit || qtyStudent.unit === qtyExpected.unit);
  checks.push({
    category: "quantity",
    label: "Quantity",
    passed: qtyPassed,
    isCritical: true,
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
    isCritical: true,
    expected: caseData.repeats,
    actual: formState.repeats || "(empty)",
    detail: rptPassed
      ? "Repeats correct"
      : `Expected: ${caseData.repeats}. You entered: ${formState.repeats || "(empty)"}`,
  });

  // ── f. Warning labels ────────────────────────────────────────────
  const correctSet = new Set(caseData.correctWarnings);
  const missing    = caseData.correctWarnings.filter((w) => !selectedWarnings.has(w));
  const extra      = Array.from(selectedWarnings).filter((w) => !correctSet.has(w));
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

  // ── g. Clinical decision ─────────────────────────────────────────
  const decisionLabels: Record<DispenseDecision, string> = {
    dispense: "Dispense after final check",
    hold_contact_prescriber: "Hold and contact the prescriber",
    do_not_supply: "Do not supply",
  };
  const decisionPassed = decision === caseData.expectedDecision;
  const issueDetail = caseData.errors.length
    ? ` Clinical issue(s): ${caseData.errors.join("; ")}`
    : " No unresolved clinical or legal issue was identified in this training case.";
  checks.push({
    category: "errors",
    label: "Clinical decision",
    passed: decisionPassed,
    isCritical: true,
    expected: decisionLabels[caseData.expectedDecision],
    actual: decision ? decisionLabels[decision] : "No decision selected",
    detail: decisionPassed
      ? `Safe disposition selected: ${decisionLabels[caseData.expectedDecision]}.${issueDetail}`
      : `Expected: ${decisionLabels[caseData.expectedDecision]}. You selected: ${
          decision ? decisionLabels[decision] : "no decision"
        }.${issueDetail}`,
  });

  const pointsEarned = checks.filter((check) => check.passed).length;
  const pointsTotal = checks.length;
  const criticalFailures = checks
    .filter((check) => check.isCritical && !check.passed)
    .map((check) => check.category);
  const passed = pointsEarned >= POINTS_TO_PASS && criticalFailures.length === 0;

  return {
    checks,
    pointsEarned,
    pointsTotal,
    passed,
    passThreshold: POINTS_TO_PASS,
    criticalFailures,
    assisted,
    countsTowardProgress: !assisted,
    tip: caseData.tip,
  };
}
