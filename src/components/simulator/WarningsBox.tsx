import type { WarningLabel } from "@/lib/types/case";

interface WarningsBoxProps {
  warnings: WarningLabel[];
  selectedWarnings: Set<string>;
  onToggle: (warningText: string) => void;
}

export function WarningsBox({ warnings, selectedWarnings, onToggle }: WarningsBoxProps) {
  return (
    <div className="fred-warn-box">
      <div className="fred-warn-title">
        Warnings — <span className="fred-warn-title-red">F2T</span>
      </div>
      <div className="fred-warn-subtitle">Select applicable labels:</div>
      <div style={{ padding: "2px 4px", overflowY: "auto" }}>
        {warnings.map((w) => {
          const selected = selectedWarnings.has(w.text);
          return (
            <div
              key={w.sig}
              className="fred-warn-item"
              onClick={() => onToggle(w.text)}
              style={
                selected
                  ? { background: "#ffffc0", fontWeight: "bold" }
                  : undefined
              }
            >
              <span className="fred-warn-lbl">{w.lbl}</span>
              <span className="fred-warn-sig">{w.sig}</span>
              <span>{w.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
