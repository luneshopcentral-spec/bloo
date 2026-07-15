import type {
  ConversationCase,
  ConversationResponseIntent,
} from "./types";

export interface PatientReplyResult {
  text: string;
  showConcern: boolean;
}

// The teach-back reply must only repeat instructions the student has actually
// given; a canned full-plan recital would hand the remaining answers to the student.
function buildTeachBackText(
  conversation: ConversationCase,
  addressedTopicIds: Set<string>
): string {
  const covered = conversation.topics.filter(
    (topic) =>
      (topic.category === "clinical_counselling" || topic.category === "safety_netting") &&
      addressedTopicIds.has(topic.id)
  );
  if (covered.length === 0) {
    return "I’m not sure I could repeat it back yet — could you go through the instructions with me first?";
  }
  return covered.map((topic) => topic.patientReplies[0]).join(" ");
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

  let response: string;
  if (selectedIds.length > 0) {
    response = selectedIds
      .slice(0, 3)
      .map((selectedId, index) => {
        const selectedTopic = topicById.get(selectedId);
        if (!selectedTopic) return "";
        if (selectedId === "teach_back") {
          const addressed = new Set([...previouslyAddressed, ...matchedTopicIds]);
          addressed.delete("teach_back");
          return buildTeachBackText(conversation, addressed);
        }
        if (previouslyAddressed.has(selectedId) && selectedTopic.repeatReply) {
          return selectedTopic.repeatReply;
        }
        if (selectedId === "invite_questions") {
          const concernAlreadyResolved =
            previouslyAddressed.has(conversation.concernTopicId) ||
            matchedTopicIds.includes(conversation.concernTopicId);
          return concernAlreadyResolved
            ? "No further questions, thank you."
            : conversation.patientQuestion;
        }
        return selectedTopic.patientReplies[
          (studentTurns + index) % selectedTopic.patientReplies.length
        ];
      })
      .filter(Boolean)
      .join(" ");
  } else if (responseIntent) {
    response = responseIntent.patientReplies[studentTurns % responseIntent.patientReplies.length];
  } else {
    response = conversation.unknownReplies[studentTurns % conversation.unknownReplies.length];
  }

  const shouldShowConcern =
    !concernShown &&
    !responseIntent?.suppressConcern &&
    studentTurns >= conversation.concernAfterTurns &&
    !previouslyAddressed.has(conversation.concernTopicId) &&
    !matchedTopicIds.includes(conversation.concernTopicId);

  return {
    text: shouldShowConcern ? `${response} ${conversation.concernPrompt}` : response,
    showConcern: shouldShowConcern,
  };
}
