import type { PracticeCase } from "@/lib/types/case";

interface ToolbarProps {
  currentCase: number;
  onCaseChange: (n: number) => void;
  cases: PracticeCase[];
  sessionScore: { correct: number; total: number };
}

export function Toolbar({ currentCase, onCaseChange, cases, sessionScore }: ToolbarProps) {
  return (
    <div className="fred-toolbar">
      <div className="fred-toolbar-reference" aria-hidden="true">
        <div className="fred-tb-btn">🔧</div>
        <div className="fred-tb-btn">INT</div>
        <div className="fred-tb-btn tb-blue">M</div>
        <div className="fred-tb-btn">📦</div>
        <div className="fred-tb-btn">📋</div>
        <div className="fred-tb-btn tb-green">$</div>
        <div className="fred-tb-sep" />
        <div className="fred-tb-btn tb-navy">PBS Online</div>
        <div className="fred-tb-btn tb-erx">eRx</div>
        <div className="fred-tb-btn tb-check">✓</div>
      </div>

      {/* Session score — resets only on page reload */}
      <div className="fred-tb-msg" aria-live="polite">
        Independent session: {sessionScore.correct}/{sessionScore.total}
      </div>

      <div className="fred-tb-sep" />

      {/* Case selector */}
      <label htmlFor="case-selector" style={{ fontSize: "11px", color: "#333", marginLeft: "4px", whiteSpace: "nowrap" }}>
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
