import type { DispenseDecision } from "@/lib/types/case";

interface ClinicalDecisionPanelProps {
  value: DispenseDecision | null;
  onChange: (decision: DispenseDecision) => void;
  disabled?: boolean;
}

const DECISIONS: Array<{
  value: DispenseDecision;
  label: string;
  detail: string;
}> = [
  {
    value: "dispense",
    label: "Dispense after final check",
    detail: "The prescription is valid, clinically appropriate and ready for supply.",
  },
  {
    value: "hold_contact_prescriber",
    label: "Hold and contact prescriber",
    detail: "Pause the supply while a clinical or legal issue is clarified.",
  },
  {
    value: "do_not_supply",
    label: "Do not supply",
    detail: "The medicine cannot be supplied safely in the current circumstances.",
  },
];

export function ClinicalDecisionPanel({
  value,
  onChange,
  disabled = false,
}: ClinicalDecisionPanelProps) {
  return (
    <fieldset className="fred-decision-panel" disabled={disabled}>
      <legend>Final clinical decision</legend>
      <div className="fred-decision-options">
        {DECISIONS.map((decision) => (
          <label
            key={decision.value}
            className={`fred-decision-option${
              value === decision.value ? " selected" : ""
            }`}
          >
            <input
              type="radio"
              name="clinical-decision"
              value={decision.value}
              checked={value === decision.value}
              onChange={() => onChange(decision.value)}
            />
            <span>
              <strong>{decision.label}</strong>
              <small>{decision.detail}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
