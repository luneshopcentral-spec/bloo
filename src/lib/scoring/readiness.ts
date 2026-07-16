import type { FormState } from "@/components/simulator/state";
import type { DispenseDecision, PracticeCase } from "@/lib/types/case";
import type { DrugRow } from "@/lib/types/drug";
import type { Patient } from "@/lib/types/patient";
import type { Prescriber } from "@/lib/types/prescriber";

interface DispenseReadinessInput {
  formState: FormState;
  selectedPatient: Patient | null;
  selectedDrugs: (DrugRow | null)[];
  selectedPrescriber: Prescriber | null;
  decision: DispenseDecision | null;
  caseData: PracticeCase;
}

export function getDispenseReadinessIssues({
  formState,
  selectedPatient,
  selectedDrugs,
  selectedPrescriber,
  decision,
  caseData,
}: DispenseReadinessInput): string[] {
  const multipleItems = caseData.items.length > 1;
  const perItem = caseData.items.flatMap((_item, index) => {
    // Name the item only when there is more than one, so single-item cases read
    // exactly as they did before.
    const label = (field: string) => (multipleItems ? `${field} for item ${index + 1}` : field);
    const itemForm = formState.items[index];
    return [
      !selectedDrugs[index] && label("specific medicine product"),
      !itemForm?.directions.trim() && label("directions"),
      !itemForm?.qty.trim() && label("quantity"),
      !itemForm?.repeats.trim() && label("repeats"),
    ];
  });

  return [
    !selectedPatient && "patient",
    !selectedPrescriber && "prescriber from directory",
    ...perItem,
    caseData.authority?.required && !formState.authorityNumber.trim() && "authority number from the prescription",
    !decision && "clinical decision",
  ].filter(Boolean) as string[];
}
