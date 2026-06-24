import type { PracticeCase } from "@/lib/types/case";

interface PatientHeaderProps {
  caseData: PracticeCase;
  onStatusUpdate: (msg: string) => void;
}

export function PatientHeader({ caseData, onStatusUpdate }: PatientHeaderProps) {
  return (
    <div className="fred-patient-header">
      <div>
        <span className="fred-ph-label">Patient Name or Repeat No</span>
        <div>
          <span
            className="fred-ph-name"
            onClick={() =>
              onStatusUpdate(
                "Patient details editing is read-only in this practice tool."
              )
            }
          >
            {caseData.patient}
          </span>
          <span className="fred-ph-addr">{caseData.addr}</span>
        </div>
        <div className="fred-ph-price">{caseData.price}</div>
      </div>
      <div className="fred-ph-mcare">{caseData.mcare}</div>
    </div>
  );
}
