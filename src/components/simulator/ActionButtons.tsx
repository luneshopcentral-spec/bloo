import type { DispenseDecision } from "@/lib/types/case";

interface ActionButtonsProps {
  onDispense: () => void;
  onShowAnswers: () => void;
  onClear: () => void;
  onNext: () => void;
  decision: DispenseDecision | null;
  answersRevealed: boolean;
  submitted: boolean;
}

export function ActionButtons({
  onDispense,
  onShowAnswers,
  onClear,
  onNext,
  decision,
  answersRevealed,
  submitted,
}: ActionButtonsProps) {
  const submitLabel =
    decision === "dispense"
      ? "✓ Dispense & Begin Handover"
      : "✓ Submit Decision & Speak to Patient";

  return (
    <div className="fred-btn-row">
      <button
        className="fred-main-btn btn-green"
        onClick={onDispense}
        disabled={submitted}
      >
        {submitted ? "Dispensing stage submitted" : submitLabel}
      </button>
      <button className="fred-main-btn" onClick={onShowAnswers} disabled={answersRevealed}>
        {answersRevealed ? "Answers revealed (assisted)" : "Show Correct Answers"}
      </button>
      <button className="fred-main-btn btn-red" onClick={onClear}>
        ✕ Clear
      </button>
      <button className="fred-main-btn fred-main-btn-next" onClick={onNext}>
        Next Case →
      </button>
    </div>
  );
}
