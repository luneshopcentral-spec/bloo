import type {
  AttemptResult,
  ConversationCase,
  ConversationMatcherMode,
  ConversationMessage,
  CounsellingResult,
  UnsafeAdviceFinding,
} from "./types";
import type { DispenseResult } from "@/lib/scoring/types";

interface ScoreCounsellingInput {
  conversation: ConversationCase;
  addressedTopicIds: Iterable<string>;
  unsafeAdvice: UnsafeAdviceFinding[];
  transcript: ConversationMessage[];
  matcherMode: ConversationMatcherMode;
}
export function scoreCounselling({
  conversation,
  addressedTopicIds,
  unsafeAdvice,
  transcript,
  matcherMode,
}: ScoreCounsellingInput): CounsellingResult {
  const addressed = new Set(addressedTopicIds);
  const topicChecks = conversation.topics.map((topic) => {
    const passed = addressed.has(topic.id);
    return {
      id: topic.id,
      label: topic.label,
      category: topic.category,
      passed,
      isCritical: Boolean(topic.critical),
      detail: passed
        ? "Addressed appropriately during the patient conversation."
        : topic.critical
          ? "Required safety-critical communication was not demonstrated."
          : "This counselling or communication point was not demonstrated.",
    } as const;
  });

  const unsafeCheck = {
    id: "unsafe_advice",
    label: "Avoid unsafe or contradictory advice",
    category: "unsafe_advice" as const,
    passed: unsafeAdvice.length === 0,
    isCritical: true,
    detail: unsafeAdvice.length === 0
      ? "No explicitly unsafe advice was detected."
      : unsafeAdvice.map((finding) => finding.detail).join(" "),
  };

  const checks = [...topicChecks, unsafeCheck];
  const pointsEarned = checks.filter((check) => check.passed).length;
  const pointsTotal = checks.length;
  const passThreshold = Math.ceil(pointsTotal * 0.7);
  const criticalFailures = checks
    .filter((check) => check.isCritical && !check.passed)
    .map((check) => check.id);

  return {
    checks,
    pointsEarned,
    pointsTotal,
    passThreshold,
    passed: pointsEarned >= passThreshold && criticalFailures.length === 0,
    criticalFailures,
    turns: transcript.filter((message) => message.role === "student").length,
    matcherMode,
    transcript,
    unsafeAdvice,
  };
}

export function combineAttemptResults(
  dispense: DispenseResult,
  counselling: CounsellingResult
): AttemptResult {
  const assisted = dispense.assisted;
  return {
    dispense,
    counselling,
    passed: dispense.passed && counselling.passed,
    assisted,
    countsTowardProgress: !assisted,
  };
}
