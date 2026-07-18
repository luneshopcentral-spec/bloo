import type { PracticeCase } from "@/lib/types/case";
import type { Patient } from "@/lib/types/patient";
import { PatientLookupField } from "./PatientLookupField";

interface PatientHeaderProps {
  caseData: PracticeCase;
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
  onAddNew: (surname: string) => void;
  onStatusUpdate: (msg: string) => void;
}

export function PatientHeader({
  caseData,
  selectedPatient,
  onPatientSelect,
  onAddNew,
  onStatusUpdate,
}: PatientHeaderProps) {
  return (
    <div className="fred-patient-header">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
        <label
          className="fred-ph-label"
          htmlFor="patient-lookup"
          style={{ whiteSpace: "nowrap" }}
        >
          Patient Name or Repeat No
        </label>
        <PatientLookupField
          selectedPatient={selectedPatient}
          onPatientSelect={onPatientSelect}
          onAddNew={onAddNew}
          onStatusUpdate={onStatusUpdate}
        />
        {selectedPatient && <div className="fred-ph-price">{caseData.price}</div>}
      </div>
      {selectedPatient ? (
        <div className="fred-ph-mcare">
          MCare {selectedPatient.medicare_card ?? "—"}&nbsp;&nbsp;to{" "}
          {selectedPatient.medicare_valid_to ?? "—"}
          {selectedPatient.concession_type && (
            <span style={{ marginLeft: "12px", color: "#006600" }}>
              [{selectedPatient.concession_type}] {selectedPatient.concession_number}
            </span>
          )}
        </div>
      ) : (
        <div className="fred-ph-mcare fred-no-patient-msg">
          Search for patient by surname above
        </div>
      )}
    </div>
  );
}
