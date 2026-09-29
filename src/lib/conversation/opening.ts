import { openingAudioSegment } from "@/lib/voice/patient-audio-library";
import type { ConversationCase, ConversationMessage } from "./types";

/** Choose once per attempt, then save the choice with the local draft. */
export function chooseConsultationStarter(draw = Math.random()): "patient" | "student" {
  return draw >= 0.5 ? "patient" : "student";
}

export function initialConversationMessages(conversation: ConversationCase, studentStarts: boolean): ConversationMessage[] {
  if (studentStarts) return [];
  const opening = openingAudioSegment(conversation);
  return [{ id: "patient-opening", role: "patient", text: opening.text, patientAudio: [opening] }];
}
