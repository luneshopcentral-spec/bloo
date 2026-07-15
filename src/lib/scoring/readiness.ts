import type { FormState } from "@/components/simulator/state";
import type { DispenseDecision, PracticeCase } from "@/lib/types/case";
import type { DrugRow } from "@/lib/types/drug";
import type { Patient } from "@/lib/types/patient";
import type { Prescriber } from "@/lib/types/prescriber";

interface DispenseReadinessInput {
  formState: FormState;
  selectedPatient: Patient | null;
  selectedDrug: DrugRow | null;
  selectedPrescriber: Prescriber | null;
  decision: DispenseDecision | null;
  caseData: PracticeCase;
}

export function getDispenseReadinessIssues({
  formState,
  selectedPatient,
  selectedDrug,
  selectedPrescriber,
  decision,
  caseData,
}: DispenseReadinessInput): string[] {
  return [
    !selectedPatient && "patient",
    !selectedPrescriber && "prescriber from directory",
    !selectedDrug && "specific medicine product",
    caseData.authority?.required && !formState.authorityNumber.trim() && "authority number from the prescription",
    !formState.directions.trim() && "directions",
    !formState.qty.trim() && "quantity",
    !formState.repeats.trim() && "repeats",
    !decision && "clinical decision",
  ].filter(Boolean) as string[];
}
