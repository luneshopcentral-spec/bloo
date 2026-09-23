import { getConversationCase } from "@/lib/conversation/cases";
import { replayConversation } from "@/lib/conversation/engine";
import type { ConversationMessage } from "@/lib/conversation/types";
import { CASE1_CORRECT_PACK_ID, evaluateStickerPlacement, stickerOverlapIssues, type Case1AssemblySubmission } from "@/lib/assembly/case1";

export const GUIDED_TUTORIAL_STEPS = [
  "welcome", "prescription", "patient", "prescriber", "medicine", "label-entry", "select-warnings",
  "initials", "decision", "dispense-submit", "pack", "main-label", "warning-labels",
  "assembly-submit", "patient-question", "patient-history", "patient-explanation",
  "patient-safety-close", "patient-understanding", "finish-consultation", "results",
] as const;
export type GuidedTutorialStep = (typeof GUIDED_TUTORIAL_STEPS)[number];
export function isGuidedTutorialStep(value: unknown): value is GuidedTutorialStep {
  return typeof value === "string" && (GUIDED_TUTORIAL_STEPS as readonly string[]).includes(value);
}

/** Recheck the current bench, including edits to previously completed steps. */
export function guidedAssemblyStep(assembly: Case1AssemblySubmission | null, expectedWarnings: string[]): GuidedTutorialStep {
  if (assembly?.packId !== CASE1_CORRECT_PACK_ID) return "pack";
  if (!evaluateStickerPlacement(assembly.mainLabelPlacement, "main").safe) return "main-label";
  const placedWarnings = Object.keys(assembly.warningPlacements);
  const warningsReady = placedWarnings.length === expectedWarnings.length
    && expectedWarnings.every(warning => evaluateStickerPlacement(assembly.warningPlacements[warning] ?? null, "warning").safe)
    && expectedWarnings.some(warning => (assembly.warningPlacements[warning]?.rotation ?? 0) % 360 !== 0)
    && stickerOverlapIssues(assembly).length === 0;
  return warningsReady ? "assembly-submit" : "warning-labels";
}

const OBJECTIVES: Partial<Record<GuidedTutorialStep, Array<[string, string]>>> = {
  "patient-question": [["introduction", "Introduce yourself as the pharmacist"], ["confirm_identity", "Ask the patient's name"], ["confirm_age", "Confirm their date of birth or age"]],
  "patient-history": [["allergies", "Ask about allergies or previous reactions"], ["current_medicines", "Check other medicines and products"]],
  "patient-explanation": [["purpose", "Explain what the antibiotic is for"], ["explain_hold", "Explain the early repeat, hold supply and contact the prescriber"], ["next_steps", "Tell the patient how you will follow up"]],
  "patient-safety-close": [["allergic_reaction_safety", "Explain urgent warning signs and what to do"]],
  "patient-understanding": [["teach_back", "Ask the patient to explain the plan back"], ["invite_questions", "Invite their questions"]],
};
export function guidedConversationProgress(step: GuidedTutorialStep, transcript: ConversationMessage[]) {
  const state = replayConversation(getConversationCase("case-1"), transcript);
  return {
    objectives: (OBJECTIVES[step] ?? []).map(([id, label]) => ({ id, label, done: state.addressed.has(id) })),
    unresolved: state.unresolvedAdviceIds.length > 0,
  };
}
export function guidedConversationStepComplete(step: GuidedTutorialStep, transcript: ConversationMessage[]) {
  const { objectives, unresolved } = guidedConversationProgress(step, transcript);
  return objectives.length > 0 && objectives.every(o => o.done) && !unresolved;
}

export const GUIDED_TUTORIAL_OPENING_MESSAGE =
  "Hello, I am the pharmacist looking after you today. Could I confirm your full name? What is your date of birth? Do you have any medicine allergies?";

export const GUIDED_TUTORIAL_EXPLANATION_MESSAGE =
  "What other medicines do you take, including vitamins or supplements? This erythromycin is an antibiotic for your infection. The repeat is too early, so I cannot supply it today. I will contact your prescriber and update you before it can be given. If the prescriber confirms it, take one capsule four times a day. Finish the full course even if you feel better.";

export const GUIDED_TUTORIAL_SAFETY_MESSAGE =
  "Take it on an empty stomach. If it causes nausea, let us know rather than changing how you take it. If you develop facial swelling or difficulty breathing, seek urgent help. Can you repeat the plan back to me in your own words? What questions do you have?";

// Compatibility helpers use the same interpretation as the live conversation.
function messageCompletes(step: GuidedTutorialStep, message: string) {
  return guidedConversationStepComplete(step, [{ id: "example", role: "student", text: message }]);
}
export const matchesGuidedOpeningMessage = (message: string) => messageCompletes("patient-question", message);
export const matchesGuidedExplanationMessage = (message: string) => messageCompletes("patient-explanation", message);
export const matchesGuidedSafetyMessage = (message: string) => messageCompletes("patient-safety-close", message) && messageCompletes("patient-understanding", message);
