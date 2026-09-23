import { z } from "zod";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { applyCaseVariant } from "@/lib/cases/variants";
import { findLocalDrugBySeedId, findLocalPrescriberByNumber } from "@/lib/directory/local-fallback";
import { ALL_PATIENTS } from "../../../supabase/seeds/patient-library";
import { validateDispense } from "@/lib/scoring/validate";
import { addAssemblyChecks } from "@/lib/assembly/all-cases";
import { getConversationCase } from "@/lib/conversation/cases";
import { evaluateConversation, MAX_CONVERSATION_MESSAGE, MAX_CONVERSATION_TURNS, MAX_CONVERSATION_CHARACTERS } from "@/lib/conversation/engine";
import { combineAttemptResults } from "@/lib/conversation/score";
import type { AttemptResult } from "@/lib/conversation/types";

const text = z.string().max(2000);
const optionalText = text.nullish();
// Rotation is around the sticker centre, so its unrotated top-left can be
// negative even when the rotated label fits. The geometry grader checks fit.
const coordinate = z.number().finite().min(-1000).max(1000);
const placement = z.object({ face: z.enum(["front", "back", "left", "right", "top", "bottom", "bag"]), x: coordinate, y: coordinate, rotation: z.number().finite().min(-360).max(360) });
const assemblyItem = z.object({ packId: text, mainLabelPlacement: placement.nullable(), warningLabels: z.array(text).max(30), warningPlacements: z.record(placement) });
export const submissionSchema = z.object({
  sessionId: z.string().uuid(),
  formState: z.object({ scriptDate: text, scriptType: text, doctor: text, prescriberNo: text, authorityNumber: text, pharmacistInitials: text, items: z.array(z.object({ drug: text, directions: text, repeats: text, qty: text, price: text })).min(1).max(5) }),
  selectedWarnings: z.array(z.array(text).max(30)).max(5),
  drugSeedIds: z.array(text.nullable()).max(5),
  prescriberNumber: text.nullable(),
  patient: z.object({ id: text, seed_id: optionalText, surname: text, firstname: text, title: optionalText, sex: optionalText, date_of_birth: optionalText, address: optionalText, suburb: optionalText, postcode: optionalText, medicare_card: optionalText, medicare_valid_to: optionalText, concession_type: optionalText, concession_number: optionalText }).nullable(),
  decision: z.enum(["dispense", "hold_contact_prescriber", "do_not_supply"]).nullable(),
  assembly: z.union([z.object({ items: z.array(assemblyItem).min(1).max(5) }), assemblyItem]).nullable(),
  transcript: z.array(z.object({ id: text, role: z.enum(["patient", "student", "system"]), text: z.string().max(MAX_CONVERSATION_MESSAGE) }))
    .max(MAX_CONVERSATION_TURNS * 2 + 1)
    .refine(turns => turns.filter(t => t.role === "student").length <= MAX_CONVERSATION_TURNS, "Conversation turn limit reached")
    .refine(turns => turns.reduce((sum, t) => sum + t.text.length, 0) <= MAX_CONVERSATION_CHARACTERS, "Conversation length limit reached"),
});
export type AttemptSubmission = z.infer<typeof submissionSchema>;
export interface PracticeSession { id: string; user_id: string; case_id: string; case_version: string; seed: number; mode: "learn" | "practice" | "exam"; assisted: boolean }

export function gradeSubmission(input: AttemptSubmission, session: PracticeSession): AttemptResult {
  const authored = STATIC_CASES.find((c) => c.id === session.case_id);
  if (!authored) throw new Error("Unknown case");
  const caseData = applyCaseVariant(authored, session.seed);
  const seedPatient = ALL_PATIENTS.find((p) => p.seed_id === input.patient?.seed_id);
  const patient = caseData.patientLookup.requiresNewPatient ? input.patient : seedPatient ? { ...seedPatient, id: `local-${seedPatient.seed_id}` } : null;
  let dispense = validateDispense({
    caseData, formState: input.formState, selectedPatient: patient,
    selectedDrugs: input.drugSeedIds.map((id) => id ? findLocalDrugBySeedId(id) : null),
    selectedPrescriber: input.prescriberNumber ? findLocalPrescriberByNumber(input.prescriberNumber) : null,
    selectedWarnings: input.selectedWarnings.map((values) => new Set(values)),
    decision: input.decision, assisted: session.assisted || session.mode === "learn",
  });
  dispense = addAssemblyChecks(dispense, caseData, input.assembly, input.selectedWarnings);
  const conversation = getConversationCase(caseData.id);
  // Browser matches, check results and numeric scores are never accepted.
  const counselling = evaluateConversation(conversation, input.transcript);
  return combineAttemptResults(dispense, counselling);
}

export function competencyMap(result: AttemptResult) {
  const totals: Record<string, { passed: number; total: number }> = {};
  for (const [stage, checks] of [["dispensing", result.dispense.checks], ["counselling", result.counselling.checks]] as const) {
    for (const check of checks) {
      const key = `${stage}:${check.category}`;
      const current = totals[key] ?? { passed: 0, total: 0 };
      totals[key] = { passed: current.passed + Number(check.passed), total: current.total + 1 };
    }
  }
  return totals;
}
