import type {
  ConversationCase,
  ConversationResponseIntent,
  ConversationTopic,
  PatientAudioSegment,
} from "@/lib/conversation/types";

export const PATIENT_AUDIO_ROOT = "/audio/patients";

export interface PatientAudioManifestEntry extends PatientAudioSegment {
  caseId: string;
  patientRole: string;
  filename: string;
  publicPath: string;
  source:
    | "opening"
    | "concern"
    | "patient_question"
    | "unknown"
    | "response_intent"
    | "topic"
    | "topic_repeat"
    | "dynamic";
}

function safeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function numberedId(prefix: string, index: number): string {
  return `${safeId(prefix)}-${String(index + 1).padStart(2, "0")}`;
}

export function openingAudioSegment(conversation: ConversationCase): PatientAudioSegment {
  return { cueId: "opening-01", text: conversation.openingMessage };
}

export function concernAudioSegment(conversation: ConversationCase): PatientAudioSegment {
  return { cueId: "concern-01", text: conversation.concernPrompt };
}

export function patientQuestionAudioSegment(
  conversation: ConversationCase
): PatientAudioSegment {
  return { cueId: "patient-question-01", text: conversation.patientQuestion };
}

export function noFurtherQuestionsAudioSegment(): PatientAudioSegment {
  return { cueId: "no-further-questions-01", text: "No further questions, thank you." };
}

export function teachBackNotReadyAudioSegment(): PatientAudioSegment {
  return {
    cueId: "teach-back-not-ready-01",
    text: "I’m not sure I could repeat it back yet — could you go through the instructions with me first?",
  };
}

export function unknownAudioSegment(
  conversation: ConversationCase,
  index: number
): PatientAudioSegment {
  return {
    cueId: numberedId("unknown", index),
    text: conversation.unknownReplies[index],
  };
}

export function responseIntentAudioSegment(
  intent: ConversationResponseIntent,
  index: number
): PatientAudioSegment {
  return {
    cueId: numberedId(`intent-${intent.id}`, index),
    text: intent.patientReplies[index],
  };
}

export function topicAudioSegment(
  topic: ConversationTopic,
  index: number
): PatientAudioSegment {
  return {
    cueId: numberedId(`topic-${topic.id}`, index),
    text: topic.patientReplies[index],
  };
}

export function topicRepeatAudioSegment(topic: ConversationTopic): PatientAudioSegment {
  return {
    cueId: `topic-${safeId(topic.id)}-repeat-01`,
    text: topic.repeatReply ?? "",
  };
}

export function patientAudioPublicPath(caseId: string, cueId: string): string {
  return `${PATIENT_AUDIO_ROOT}/${safeId(caseId)}/${safeId(cueId)}.mp3`;
}

export function buildConversationAudioManifest(
  conversation: ConversationCase
): PatientAudioManifestEntry[] {
  const rows: Array<PatientAudioSegment & { source: PatientAudioManifestEntry["source"] }> = [
    { ...openingAudioSegment(conversation), source: "opening" },
    { ...concernAudioSegment(conversation), source: "concern" },
    { ...patientQuestionAudioSegment(conversation), source: "patient_question" },
    { ...noFurtherQuestionsAudioSegment(), source: "dynamic" },
    { ...teachBackNotReadyAudioSegment(), source: "dynamic" },
    ...conversation.unknownReplies.map((_, index) => ({
      ...unknownAudioSegment(conversation, index),
      source: "unknown" as const,
    })),
    ...conversation.responseIntents.flatMap((intent) =>
      intent.patientReplies.map((_, index) => ({
        ...responseIntentAudioSegment(intent, index),
        source: "response_intent" as const,
      }))
    ),
    ...conversation.topics.flatMap((topic) => [
      ...topic.patientReplies.map((_, index) => ({
        ...topicAudioSegment(topic, index),
        source: "topic" as const,
      })),
      ...(topic.repeatReply
        ? [{ ...topicRepeatAudioSegment(topic), source: "topic_repeat" as const }]
        : []),
    ]),
  ];

  const unique = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!row.text.trim()) continue;
    const existing = unique.get(row.cueId);
    if (existing && existing.text !== row.text) {
      throw new Error(
        `Patient audio cue ${conversation.caseId}/${row.cueId} has conflicting scripts.`
      );
    }
    unique.set(row.cueId, row);
  }

  return [...unique.values()].map((row) => {
    const filename = `${safeId(row.cueId)}.mp3`;
    return {
      ...row,
      caseId: conversation.caseId,
      patientRole: conversation.patientRole,
      filename,
      publicPath: patientAudioPublicPath(conversation.caseId, row.cueId),
    };
  });
}
