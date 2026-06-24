interface ActionButtonsProps {
  onDispense: () => void;
  onShowAnswers: () => void;
  onClear: () => void;
  onNext: () => void;
}

export function ActionButtons({
  onDispense,
  onShowAnswers,
  onClear,
  onNext,
}: ActionButtonsProps) {
  return (
    <div className="fred-btn-row">
      <button className="fred-main-btn btn-green" onClick={onDispense}>
        ✓ Dispense &amp; Print Label
      </button>
      <button className="fred-main-btn" onClick={onShowAnswers}>
        Show Correct Answers
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
