import type {
  ConversationCase,
  ConversationResponseIntent,
  PatientAudioSegment,
} from "./types";
import {
  concernAudioSegment,
  noFurtherQuestionsAudioSegment,
  patientQuestionAudioSegment,
  responseIntentAudioSegment,
  teachBackNotReadyAudioSegment,
  topicAudioSegment,
  topicRepeatAudioSegment,
  unknownAudioSegment,
} from "@/lib/voice/patient-audio-library";

export interface PatientReplyResult {
  text: string;
  audioSegments: PatientAudioSegment[];
  showConcern: boolean;
}

// The teach-back reply must only repeat instructions the student has actually
// given; a canned full-plan recital would hand the remaining answers to the student.
function buildTeachBackSegments(
  conversation: ConversationCase,
  addressedTopicIds: Set<string>
): PatientAudioSegment[] {
  const covered = conversation.topics.filter(
    (topic) =>
      (topic.category === "clinical_counselling" || topic.category === "safety_netting") &&
      addressedTopicIds.has(topic.id)
  );
  if (covered.length === 0) {
    return [teachBackNotReadyAudioSegment()];
  }
  return covered.map((topic) => topicAudioSegment(topic, 0));
}

export function buildPatientReply(
  conversation: ConversationCase,
  matchedTopicIds: string[],
  previouslyAddressed: Set<string>,
  studentTurns: number,
  concernShown: boolean,
  responseIntent: ConversationResponseIntent | null
): PatientReplyResult {
  const topicById = new Map(conversation.topics.map((topic) => [topic.id, topic]));
  const newTopicIds = matchedTopicIds.filter((id) => !previouslyAddressed.has(id));
  const selectedIds = newTopicIds.length > 0 ? newTopicIds : matchedTopicIds.slice(0, 1);

  let responseSegments: PatientAudioSegment[];
  if (selectedIds.length > 0) {
    responseSegments = selectedIds
      .slice(0, 3)
      .flatMap((selectedId, index) => {
        const selectedTopic = topicById.get(selectedId);
        if (!selectedTopic) return [];
        if (selectedId === "teach_back") {
          const addressed = new Set([...previouslyAddressed, ...matchedTopicIds]);
          addressed.delete("teach_back");
          return buildTeachBackSegments(conversation, addressed);
        }
        if (previouslyAddressed.has(selectedId) && selectedTopic.repeatReply) {
          return [topicRepeatAudioSegment(selectedTopic)];
        }
        if (selectedId === "invite_questions") {
          const concernAlreadyResolved =
            previouslyAddressed.has(conversation.concernTopicId) ||
            matchedTopicIds.includes(conversation.concernTopicId);
          return [
            concernAlreadyResolved
              ? noFurtherQuestionsAudioSegment()
              : patientQuestionAudioSegment(conversation),
          ];
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
