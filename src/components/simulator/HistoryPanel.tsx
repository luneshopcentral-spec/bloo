import type { PracticeCase, PatientHistoryItem } from "@/lib/types/case";

interface HistoryPanelProps {
  caseData: PracticeCase;
  onStatusUpdate: (msg: string) => void;
}

export function HistoryPanel({ caseData, onStatusUpdate }: HistoryPanelProps) {
  const hasAllergy = caseData.allergies !== "NKDA";

  function handleItemClick(h: PatientHistoryItem) {
    onStatusUpdate(
      `Viewing history: ${h.drug} from ${h.date} — Qty ${h.qty}, ${h.rpt} repeats`
    );
  }

  return (
    <div className="fred-history-panel">
      <div className="fred-hp-header">Patient History</div>

      {/* Column headers */}
      <div className="fred-hp-table-header">
        <span>Date</span>
        <span>Rx</span>
        <span>Qty</span>
        <span>Rpt</span>
      </div>
      <div className="fred-hp-drug-col-header">Drug Description</div>

      {/* History rows */}
      {caseData.patientHistory.map((h, i) => (
        <div
          key={i}
          className="fred-hp-item"
          onClick={() => handleItemClick(h)}
        >
          <div className="fred-hp-item-grid">
            <span className="fred-hp-date">{h.date}</span>
            <span>{h.rx}</span>
            <span>{h.qty}</span>
            <span>{h.rpt}</span>
          </div>
          <div className="fred-hp-drug">{h.drug}</div>
        </div>
      ))}

      {/* Allergies */}
      <div className="fred-hp-section">
        <div className="fred-hp-section-label">Allergies</div>
        <div
          className={`fred-hp-allergy ${
            hasAllergy ? "has-allergy" : "no-allergy"
          }`}
        >
          {hasAllergy ? `⚠ ${caseData.allergies}` : "No known allergies"}
        </div>
      </div>

      {/* Current medications */}
      <div className="fred-hp-section">
        <div className="fred-hp-section-label">Current Medications</div>
        <div
          className="fred-hp-meds"
          dangerouslySetInnerHTML={{ __html: caseData.currentMeds }}
        />
      </div>
    </div>
  );
}
