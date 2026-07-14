import type { PracticeCase } from "@/lib/types/case";
import { PRACTICE_MODE_COPY, type PracticeMode } from "@/lib/practice/modes";

interface ToolbarProps {
  currentCase: number;
  onCaseChange: (n: number) => void;
  cases: PracticeCase[];
  sessionScore: { correct: number; total: number };
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
}

export function Toolbar({ currentCase, onCaseChange, cases, sessionScore, mode, onModeChange }: ToolbarProps) {
  return (
    <div className="fred-toolbar">
      <label htmlFor="practice-mode" className="fred-toolbar-label">Mode:</label>
      <select
        id="practice-mode"
        className="fred-mode-select"
        value={mode}
        onChange={(event) => onModeChange(event.target.value as PracticeMode)}
        title={PRACTICE_MODE_COPY[mode].description}
      >
        {(Object.keys(PRACTICE_MODE_COPY) as PracticeMode[]).map((value) => (
          <option key={value} value={value}>{PRACTICE_MODE_COPY[value].label}</option>
        ))}
      </select>
      <span className="fred-mode-description">{PRACTICE_MODE_COPY[mode].description}</span>

      {/* Session score — resets only on page reload */}
      <div className="fred-tb-msg" aria-live="polite">
        Independent session: {sessionScore.correct}/{sessionScore.total}
      </div>

      <div className="fred-tb-sep" />

      {/* Case selector */}
      <label htmlFor="case-selector" className="fred-toolbar-label">
        Case:
      </label>
      <select
        id="case-selector"
        className="fred-case-select"
        value={currentCase}
        onChange={(e) => onCaseChange(parseInt(e.target.value, 10))}
      >
        {cases.map((c, i) => (
          <option key={c.id} value={i}>
            Case {c.caseNumber} — {c.title.replace(/^Case \d+ — /, "")}
          </option>
        ))}
      </select>
    </div>
  );
}
