import type {
  ConversationCase,
  ConversationResponseIntent,
} from "./types";

export interface PatientReplyResult {
  text: string;
  showConcern: boolean;
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
        if (previouslyAddressed.has(selectedId) && selectedTopic.repeatReply) {
          return selectedTopic.repeatReply;
        }
        if (selectedId === "invite_questions") return conversation.patientQuestion;
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
