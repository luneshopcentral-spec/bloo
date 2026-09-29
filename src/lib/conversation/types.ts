import type { DispenseResult } from "@/lib/scoring/types";

export type ConversationTopicCategory =
  | "communication"
  | "information_gathering"
  | "clinical_counselling"
  | "safety_netting";

// Matching and scoring are fully deterministic (rules-based). The optional
// on-device semantic model was removed; this stays a named type so the scoring
// result and UI can label the method without a bare string literal.
export type ConversationMatcherMode = "rules";

export interface ConversationTopic {
  id: string;
  label: string;
  category: ConversationTopicCategory;
  critical?: boolean;
  examples: string[];
  fallbackPatterns: string[];
  requiredPatternGroups?: string[][];
  forbiddenPatterns?: string[];
  patientReplies: string[];
  repeatReply?: string;
  /** Case-authored follow-up when only part of a counselling point was explained. */
  clarificationPrompt?: string;
  /** Specific case facts disclosed when one part of a multi-part history question is asked. */
  partialQuestionReplies?: Array<{ pattern: string; reply: string }>;
  feedback?: string;
  /** Optional discussion topics do not become requirements for this disposition. */
  assessed?: boolean;
  /** A recap of this point only, used after the student has explained it. */
  teachBackReply?: string;
  /**
   * For counselling that can be given in parts: the patient's reply and
   * teach-back say only the points the student actually made, never the rest
   * of the model answer. `patientReplies` are then neutral acknowledgements,
   * used when the wording matched the topic but none of its points.
   */
  grounded?: GroundedReply;
}

/** One point a student may make, and how the patient puts it in their own words. */
export interface HeardPoint {
  /** Pattern over one clause of the student's words (lower-cased, typos corrected). */
  heard: string;
  /** The patient's words for this point, written to fit its sentence template. */
  says: string;
  /**
   * Which mentions count: "either" (default), "affirmed" (ignores "don't…",
   * "avoid…" mentions) or "negated" (only those).
   */
  polarity?: "affirmed" | "negated" | "either";
  /** When several points in one group are heard, only the first is said. */
  group?: string;
}

export interface PatientSentence {
  /** The patient's sentence with a {points} placeholder. */
  template: string;
  /** "and" joins instructions; "or" joins warning signs. Defaults to "and". */
  joiner?: "and" | "or";
  points: HeardPoint[];
}

export interface GroundedReply {
  /** Opening words for a live reply, e.g. "Okay —". Not used in teach-back. */
  leadIn?: string;
  sentences: PatientSentence[];
}

export interface ConversationResponseIntent {
  id: string;
  fallbackPatterns: string[];
  patientReplies: string[];
  /** Answer a direct patient-history question even if another clause scored a topic. */
  answerAlongsideTopics?: boolean;
  suppressConcern?: boolean;
}

export interface PatientAudioSegment {
  /** Stable identifier used for public/audio/patients/<case>/<cueId>.mp3. */
  cueId: string;
  /** Canonical clinically reviewed text spoken by this audio segment. */
  text: string;
}
export interface UnsafeAdviceRule {
  id: string;
  label: string;
  patterns: string[];
  detail: string;
}

export interface ConversationCase {
  caseId: string;
  patientRole: string;
  openingMessage: string;
  handoverGoal: string;
  concernAfterTurns: number;
  concernTopicId: string;
  concernPrompt: string;
  /**
   * What the patient asks instead, when the student has not yet said anything
   * about a hold or delay — so "Why can't I collect it today?" is never asked
   * before the patient has been told they can't.
   */
  concernPromptUninformed?: string;
  /**
   * The concern is about getting the medicine today. It is dropped once the
   * student has (wrongly) told the patient the medicine is ready.
   */
  concernAboutCollecting?: boolean;
  patientQuestion: string;
  /**
   * The patient's question only makes sense once the student has put supply
   * on hold ("What happens next?"). Before that the patient asks whether the
   * medicine is ready; after being told (wrongly) that it is, they have none.
   */
  patientQuestionAssumesHold?: boolean;
  /** How the patient rewords one of their own prompts when asked "what do you mean?". */
  rephrasings?: Record<string, string>;
  unknownReplies: string[];
  responseIntents: ConversationResponseIntent[];
  topics: ConversationTopic[];
  unsafeAdviceRules: UnsafeAdviceRule[];
  disposition?: "dispense" | "hold_contact_prescriber" | "do_not_supply";
  patientQuestionTopicId?: string;
  doseRules?: Array<{ topicId: string; amountPattern: string; frequencyPattern: string; medicinePattern?: string }>;
}

export interface AcceptedTopicMatch {
  topicId: string;
  score: number;
  source: ConversationMatcherMode;
}

export interface ConversationMessage {
  id: string;
  role: "patient" | "student" | "system";
  text: string;
  matchedTopicIds?: string[];
  patientAudio?: PatientAudioSegment[];
}

export interface UnsafeAdviceFinding {
  id: string;
  label: string;
  detail: string;
  excerpt: string;
}

export interface CounsellingCheck {
  id: string;
  label: string;
  category: ConversationTopicCategory | "unsafe_advice";
  passed: boolean;
  isCritical: boolean;
  detail: string;
  evidence?: string[];
}

export interface CounsellingResult {
  checks: CounsellingCheck[];
  pointsEarned: number;
  pointsTotal: number;
  passThreshold: number;
  passed: boolean;
  criticalFailures: string[];
  turns: number;
  matcherMode: ConversationMatcherMode;
  transcript: ConversationMessage[];
  unsafeAdvice: UnsafeAdviceFinding[];
}

export interface AttemptResult {
  dispense: DispenseResult;
  counselling: CounsellingResult;
  passed: boolean;
  assisted: boolean;
  countsTowardProgress: boolean;
}
