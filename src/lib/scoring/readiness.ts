import type { FormState } from "@/components/simulator/state";
import type { DispenseDecision } from "@/lib/types/case";
import type { DrugRow } from "@/lib/types/drug";
import type { Patient } from "@/lib/types/patient";

interface DispenseReadinessInput {
  formState: FormState;
  selectedPatient: Patient | null;
  selectedDrug: DrugRow | null;
  decision: DispenseDecision | null;
}

export function getDispenseReadinessIssues({
  formState,
  selectedPatient,
  selectedDrug,
  decision,
}: DispenseReadinessInput): string[] {
  return [
    !selectedPatient && "patient",
    !selectedDrug && "specific medicine product",
    !formState.directions.trim() && "directions",
    !formState.qty.trim() && "quantity",
    !formState.repeats.trim() && "repeats",
    !decision && "clinical decision",
  ].filter(Boolean) as string[];
}
