import type { DispenseResult } from "@/lib/scoring/types";

export type ConversationTopicCategory =
  | "communication"
  | "information_gathering"
  | "clinical_counselling"
  | "safety_netting";

export type ConversationMatcherMode = "semantic" | "rules";

export interface ConversationTopic {
  id: string;
  label: string;
  category: ConversationTopicCategory;
  critical?: boolean;
  examples: string[];
  fallbackPatterns: string[];
  requiredPatternGroups?: string[][];
  forbiddenPatterns?: string[];
  semanticThreshold?: number;
  patientReplies: string[];
  repeatReply?: string;
  feedback?: string;
}

export interface ConversationResponseIntent {
  id: string;
  fallbackPatterns: string[];
  patientReplies: string[];
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
  patientQuestion: string;
  unknownReplies: string[];
  responseIntents: ConversationResponseIntent[];
  topics: ConversationTopic[];
  unsafeAdviceRules: UnsafeAdviceRule[];
}

export interface SemanticCandidate {
  topicId: string;
  score: number;
}

export interface AcceptedTopicMatch extends SemanticCandidate {
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
