import type { FormState } from "@/components/simulator/state";
import type { PracticeCase } from "@/lib/types/case";
import { expandAbbrevs } from "./abbreviations";
import type { CheckResult, DispenseResult } from "./types";
import { POINTS_TO_PASS } from "./types";

export interface ValidateInput {
  formState: FormState;
  selectedWarnings: Set<string>;
  caseData: PracticeCase;
}

function extractDigits(s: string): string {
  return (s.match(/\d+/) ?? [""])[0];
}

export function validateDispense({
  formState,
  selectedWarnings,
  caseData,
}: ValidateInput): DispenseResult {
  const checks: CheckResult[] = [];

  // ── a. Drug ──────────────────────────────────────────────────────
  const drugEntered = formState.drug.trim().toLowerCase();
  const drugFirstWord = caseData.drug.toLowerCase().split(" ")[0];
  const drugPassed = drugEntered.includes(drugFirstWord);
  checks.push({
    category: "drug",
    label: "Drug entered",
    passed: drugPassed,
    expected: caseData.drug,
    actual: formState.drug || "(empty)",
    detail: drugPassed
      ? "Correct drug selected"
      : `Expected: ${caseData.drug}. You entered: ${formState.drug || "(empty)"}`,
  });

  // ── b. Directions ────────────────────────────────────────────────
  const expectedExpanded = expandAbbrevs(caseData.directions).toLowerCase();
  const studentExpanded = expandAbbrevs(formState.directions).toLowerCase();
  const expectedWords = expectedExpanded
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const matchCount = expectedWords.filter((w) =>
    studentExpanded.includes(w)
  ).length;
  const dirPassed =
    expectedWords.length > 0 && matchCount / expectedWords.length >= 0.5;
  checks.push({
    category: "directions",
    label: "Directions",
    passed: dirPassed,
    expected: caseData.directions,
    actual: formState.directions || "(empty)",
    detail: dirPassed
      ? "Directions correct (abbreviations accepted)"
      : `Expected: ${caseData.directions}. You entered: ${
          formState.directions || "(empty)"
        }`,
  });

  // ── c. Quantity ──────────────────────────────────────────────────
  const qtyExpected = extractDigits(String(caseData.qty));
  const qtyStudent = extractDigits(formState.qty);
  const qtyPassed = qtyExpected !== "" && qtyStudent === qtyExpected;
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

  // ── d. Repeats ───────────────────────────────────────────────────
  const rptPassed = formState.repeats.trim() === caseData.repeats;
  checks.push({
    category: "repeats",
    label: "Repeats",
    passed: rptPassed,
    expected: caseData.repeats,
    actual: formState.repeats || "(empty)",
    detail: rptPassed
      ? "Repeats correct"
      : `Expected: ${caseData.repeats}. You entered: ${
          formState.repeats || "(empty)"
        }`,
  });

  // ── e. Warning labels ────────────────────────────────────────────
  const correctSet = new Set(caseData.correctWarnings);
  const missing = caseData.correctWarnings.filter(
    (w) => !selectedWarnings.has(w)
  );
  const extra = [...selectedWarnings].filter((w) => !correctSet.has(w));
  const warnsPassed = missing.length === 0 && extra.length === 0;
  const warnsDetail = warnsPassed
    ? "All correct labels selected"
    : [
        missing.length ? `Missing: ${missing.join("; ")}` : "",
        extra.length ? `Extra: ${extra.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
  checks.push({
    category: "warnings",
    label: "Warning labels",
    passed: warnsPassed,
    detail: warnsDetail,
  });

  // ── f. Error detection ───────────────────────────────────────────
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
  const pointsTotal = 6;

  return {
    checks,
    pointsEarned,
    pointsTotal,
    passed: pointsEarned >= POINTS_TO_PASS,
    passThreshold: POINTS_TO_PASS,
    tip: caseData.tip,
  };
}
