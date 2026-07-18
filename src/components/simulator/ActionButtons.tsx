import type { DispenseDecision } from "@/lib/types/case";

interface ActionButtonsProps {
  onDispense: () => void;
  onShowAnswers: () => void;
  onClear: () => void;
  onNext: () => void;
  decision: DispenseDecision | null;
  answersRevealed: boolean;
  submitted: boolean;
  allowAnswerReveal: boolean;
  readinessIssues: string[];
  hasProgress: boolean;
}

export function ActionButtons({
  onDispense,
  onShowAnswers,
  onClear,
  onNext,
  decision,
  answersRevealed,
  submitted,
  allowAnswerReveal,
  readinessIssues,
  hasProgress,
}: ActionButtonsProps) {
  const submitLabel = decision === "dispense"
    ? "Complete dispensing → Patient handover"
    : "Submit decision → Patient consultation";
  const visibleIssues = readinessIssues.slice(0, 4);
  const remainingIssueCount = readinessIssues.length - visibleIssues.length;

  function handleRevealAnswers() {
    if (!window.confirm("Reveal the correct dispensing answers? This attempt will be marked as assisted and will not count toward progress.")) return;
    onShowAnswers();
  }

  function handleReset() {
    if (hasProgress && !window.confirm("Reset this case and clear the dispensing work you have entered?")) return;
    onClear();
  }

  function handleSkip() {
    if (hasProgress && !window.confirm("Skip this case? Your current dispensing work will be cleared.")) return;
    onNext();
  }

  return (
    <>
      <div
        className={`fred-readiness${readinessIssues.length === 0 ? " ready" : ""}`}
        role="status"
        aria-live="polite"
      >
        <span className="fred-readiness-icon" aria-hidden="true">
          {readinessIssues.length === 0 ? "✓" : readinessIssues.length}
        </span>
        <div>
          <strong>
            {readinessIssues.length === 0
              ? "Final check complete"
              : `${readinessIssues.length} required ${readinessIssues.length === 1 ? "item" : "items"} remaining`}
          </strong>
          <span>
            {readinessIssues.length === 0
              ? "The required workflow fields are complete. Review them before submitting."
              : `${visibleIssues.join(" · ")}${remainingIssueCount > 0 ? ` · +${remainingIssueCount} more` : ""}`}
          </span>
        </div>
      </div>
      <div className="fred-btn-row">
        <button
          type="button"
          className="fred-main-btn btn-green"
          onClick={onDispense}
          disabled={submitted}
        >
          {submitted ? "Dispensing stage submitted" : submitLabel}
        </button>
        {allowAnswerReveal && (
          <button
            type="button"
            className="fred-main-btn fred-answer-btn"
            onClick={handleRevealAnswers}
            disabled={answersRevealed}
            title="Revealing answers makes this an assisted attempt"
          >
            {answersRevealed ? "Answers revealed · Assisted" : "Reveal answers"}
          </button>
        )}
        <button type="button" className="fred-main-btn btn-red" onClick={handleReset}>
          Reset case
        </button>
        <button type="button" className="fred-main-btn fred-main-btn-next" onClick={handleSkip}>
          Skip case →
        </button>
      </div>
    </>
  );
}
