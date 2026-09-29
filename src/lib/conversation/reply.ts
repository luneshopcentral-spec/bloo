import type {
  ConversationCase,
  ConversationResponseIntent,
  PatientAudioSegment,
} from "./types";
import { groundedLine } from "./grounding";
import {
  concernAudioSegment,
  dynamicAudioSegment,
  noFurtherQuestionsAudioSegment,
  patientQuestionAudioSegment,
  responseIntentAudioSegment,
  teachBackNotReadyAudioSegment,
  topicAudioSegment,
  topicRepeatAudioSegment,
  topicTeachBackAudioSegment,
  unknownAudioSegment,
} from "@/lib/voice/patient-audio-library";

export interface PatientReplyResult {
  text: string;
  audioSegments: PatientAudioSegment[];
  showConcern: boolean;
}

/** What the patient asks when the student invites questions. */
export type PatientInvitation =
  | { kind: "question" }
  | { kind: "concern"; text: string }
  | { kind: "none" };

export interface PatientReplyContext {
  /** The student's words for each topic matched in this turn. */
  heard?: Record<string, string[]>;
  /** Everything the student has said for each topic, for teach-back. */
  evidence?: Record<string, string[]>;
  invitation?: PatientInvitation;
}

/**
 * A question that assumes supply is on hold ("What happens next?") is only
 * asked once the student has said so. Before that the patient asks whether
 * the medicine is ready; told (wrongly) that it is, they have nothing to ask.
 */
export function patientInvitation(
  conversation: ConversationCase,
  view: { supplyPromised: boolean; holdSignalled: boolean }
): PatientInvitation {
  if (!conversation.patientQuestionAssumesHold) return { kind: "question" };
  if (view.supplyPromised) return { kind: "none" };
  if (!view.holdSignalled) {
    return { kind: "concern", text: conversation.concernPromptUninformed ?? conversation.concernPrompt };
  }
  return { kind: "question" };
}

// The teach-back reply must only repeat instructions the student has actually
// given; a canned full-plan recital would hand the remaining answers to the student.
function buildTeachBackSegments(
  conversation: ConversationCase,
  addressedTopicIds: Set<string>,
  evidence: Record<string, string[]> | undefined
): PatientAudioSegment[] {
  const covered = conversation.topics.filter(
    (topic) =>
      (topic.category === "clinical_counselling" || topic.category === "safety_netting" || topic.teachBackReply) &&
      addressedTopicIds.has(topic.id)
  );
  if (covered.length === 0) {
    return [teachBackNotReadyAudioSegment()];
  }
  const segments = covered.flatMap((topic) => {
    const words = evidence?.[topic.id];
    if (topic.grounded && words) {
      const line = groundedLine(topic.grounded, words, false);
      return line ? [dynamicAudioSegment(line)] : [];
    }
    return topic.teachBackReply ? [topicTeachBackAudioSegment(topic)] : [];
  });
  return segments.length ? segments : [teachBackNotReadyAudioSegment()];
}

export function buildPatientReply(
  conversation: ConversationCase,
  matchedTopicIds: string[],
  previouslyAddressed: Set<string>,
  studentTurns: number,
  concernShown: boolean,
  responseIntent: ConversationResponseIntent | null,
  context: PatientReplyContext = {}
): PatientReplyResult {
  const topicById = new Map(conversation.topics.map((topic) => [topic.id, topic]));
  const selectedIds = matchedTopicIds;

  let responseSegments: PatientAudioSegment[];
  if (selectedIds.length > 0) {
    responseSegments = selectedIds
      .flatMap((selectedId, index) => {
        const selectedTopic = topicById.get(selectedId);
        if (!selectedTopic) return [];
        if (selectedId === "teach_back") {
          const addressed = new Set([...previouslyAddressed, ...matchedTopicIds]);
          addressed.delete("teach_back");
          return buildTeachBackSegments(conversation, addressed, context.evidence);
        }
        if (selectedId === "invite_questions") {
          const questionTopicId = conversation.patientQuestionTopicId ?? conversation.concernTopicId;
          const concernAlreadyResolved =
            previouslyAddressed.has(questionTopicId) || matchedTopicIds.includes(questionTopicId);
          const invitation = context.invitation ?? { kind: "question" };
          if (concernAlreadyResolved || invitation.kind === "none") return [noFurtherQuestionsAudioSegment()];
          if (invitation.kind === "concern") return [dynamicAudioSegment(invitation.text)];
          return [patientQuestionAudioSegment(conversation)];
        }
        const heard = context.heard?.[selectedId];
        if (selectedTopic.grounded && heard) {
          const line = groundedLine(selectedTopic.grounded, heard, true);
          if (line) return [dynamicAudioSegment(line)];
        }
        if (previouslyAddressed.has(selectedId) && selectedTopic.repeatReply) {
          return [topicRepeatAudioSegment(selectedTopic)];
        }
        const replyIndex = (studentTurns + index) % selectedTopic.patientReplies.length;
        return [topicAudioSegment(selectedTopic, replyIndex)];
      })
      .filter((segment) => segment.text.trim());
  } else if (responseIntent) {
    const replyIndex = studentTurns % responseIntent.patientReplies.length;
    responseSegments = [responseIntentAudioSegment(responseIntent, replyIndex)];
  } else {
    const replyIndex = studentTurns % conversation.unknownReplies.length;
    responseSegments = [unknownAudioSegment(conversation, replyIndex)];
  }

  const shouldShowConcern =
    !concernShown &&
    !responseIntent?.suppressConcern &&
    studentTurns >= conversation.concernAfterTurns &&
    !previouslyAddressed.has(conversation.concernTopicId) &&
    !matchedTopicIds.includes(conversation.concernTopicId);

  if (shouldShowConcern) responseSegments.push(concernAudioSegment(conversation));

  return {
    text: responseSegments.map((segment) => segment.text).join(" "),
    audioSegments: responseSegments,
    showConcern: shouldShowConcern,
  };
}
