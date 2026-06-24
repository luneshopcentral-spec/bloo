import type { PracticeCase } from "@/lib/types/case";

interface CasePanelProps {
  caseData: PracticeCase;
}

export function CasePanel({ caseData }: CasePanelProps) {
  return (
    <div className="fred-case-panel">
      <div className="fred-case-title">📋 {caseData.title}</div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="fred-case-section-title">Presenting Complaint</div>
          <div className="fred-case-text">{caseData.complaint}</div>
        </div>
        <div>
          <div className="fred-case-section-title">Patient History</div>
          <div
            className="fred-case-text"
            dangerouslySetInnerHTML={{ __html: caseData.history }}
          />
        </div>
      </div>

      <div style={{ marginTop: "6px" }}>
        <div className="fred-case-section-title">⚠️ Clinical Task</div>
        <div className="fred-case-task">{caseData.task}</div>
      </div>
    </div>
  );
}
