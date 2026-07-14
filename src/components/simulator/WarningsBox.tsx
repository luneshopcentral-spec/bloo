import type { WarningLabel } from "@/lib/types/case";
import { MedicinesReferenceDesk } from "@/components/simulator/MedicinesReferenceDesk";

interface WarningsBoxProps {
  warnings: WarningLabel[];
  selectedWarnings: Set<string>;
  onToggle: (warningText: string) => void;
  medicineName: string;
}

export function WarningsBox({
  warnings,
  selectedWarnings,
  onToggle,
  medicineName,
}: WarningsBoxProps) {
  return (
    <fieldset className="fred-warn-box">
      <legend className="fred-warn-title">
        Warnings — <span className="fred-warn-title-red">F2T</span>
      </legend>
      <div className="fred-warn-subtitle">
        <span>Select applicable labels:</span>
        <MedicinesReferenceDesk medicineName={medicineName} />
      </div>
      <div style={{ padding: "2px 4px", overflowY: "auto" }}>
        {warnings.map((w) => {
          const selected = selectedWarnings.has(w.text);
          return (
            <label
              key={w.sig}
              className="fred-warn-item"
              style={
                selected
                  ? { background: "#ffffc0", fontWeight: "bold" }
                  : undefined
              }
            >
              <input
                className="fred-warn-checkbox"
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(w.text)}
              />
              <span className="fred-warn-lbl">{w.lbl}</span>
              <span className="fred-warn-sig">{w.sig}</span>
              <span>{w.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
