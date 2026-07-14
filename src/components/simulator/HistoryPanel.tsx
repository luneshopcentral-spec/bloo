import type { Patient, PatientScript } from "@/lib/types/patient";

interface HistoryPanelProps {
  patient: Patient | null;
  patientScripts: PatientScript[];
  onStatusUpdate: (msg: string) => void;
}

export function HistoryPanel({
  patient,
  patientScripts,
  onStatusUpdate,
}: HistoryPanelProps) {
  const allergies = patient?.allergies ?? [];
  const hasAllergy = allergies.length > 0;

  function handleItemClick(s: PatientScript) {
    onStatusUpdate(
      `Script: ${s.drug} from ${s.script_date} — Qty ${s.qty ?? "—"}, ${
        s.repeats ?? 0
      } repeats`
    );
  }

  return (
    <div className="fred-history-panel">
      <div className="fred-hp-header">Patient History</div>

      <div className="fred-hp-table-header">
        <span>Date</span>
        <span>Rx</span>
        <span>Qty</span>
        <span>Rpt</span>
      </div>
      <div className="fred-hp-drug-col-header">Drug Description</div>

      {patientScripts.length === 0 && (
        <div
          className="fred-no-patient-msg"
          style={{ padding: "6px 6px", borderBottom: "1px solid #ccc" }}
        >
          {patient ? "No history on file" : "No patient selected"}
        </div>
      )}

      {patientScripts.map((s, i) => (
        <button
          type="button"
          key={i}
          className="fred-hp-item"
          onClick={() => handleItemClick(s)}
          aria-label={`${s.drug}, supplied ${s.script_date}, quantity ${s.qty ?? "not recorded"}, ${s.repeats ?? 0} repeats`}
        >
          <div className="fred-hp-item-grid">
            <span className="fred-hp-date">{s.script_date}</span>
            <span>{s.rx_number ?? "—"}</span>
            <span>{s.qty ?? "—"}</span>
            <span>{String(s.repeats ?? 0)}</span>
          </div>
          <div className="fred-hp-drug">{s.drug}</div>
        </button>
      ))}

      <div className="fred-hp-section">
        <div className="fred-hp-section-label">Allergies</div>
        <div
          className={`fred-hp-allergy ${
            hasAllergy ? "has-allergy" : "no-allergy"
          }`}
        >
          {hasAllergy
            ? `⚠ ${allergies.join(", ")}`
            : patient
            ? "No known allergies"
            : "—"}
        </div>
      </div>

      {patient?.patient_notes && (
        <div className="fred-hp-section">
          <div className="fred-hp-section-label">Patient Notes</div>
          <div className="fred-hp-meds">{patient.patient_notes}</div>
        </div>
      )}
    </div>
  );
}
