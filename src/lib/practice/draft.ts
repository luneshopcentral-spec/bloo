import type { AttemptSubmission } from "@/lib/attempts/grade";
import type { ConversationMessage } from "@/lib/conversation/types";
import type { PracticeMode } from "./modes";
export interface PracticeDraft {
  tutorialStep?: import("./guided-tutorial").GuidedTutorialStep;
  caseIndex: number; caseVersion: string; seed: number; mode: PracticeMode;
  stage: "dispensing" | "assembly" | "counselling"; assisted: boolean; sessionId: string | null;
  formState: AttemptSubmission["formState"]; patient: AttemptSubmission["patient"];
  drugSeedIds: (string | null)[]; prescriberNumber: string | null;
  prescriber?: import("@/lib/types/prescriber").Prescriber | null;
  warnings: string[][]; decision: AttemptSubmission["decision"];
  assembly: AttemptSubmission["assembly"]; transcript: ConversationMessage[];
}
