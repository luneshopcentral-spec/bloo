import type { PracticeCase } from "@/lib/types/case";
import type { DrugRow } from "@/lib/types/drug";

interface DrugDetailsBoxProps {
  selectedDrug: DrugRow | null;
  caseData: PracticeCase;
  patientAllergies?: string[];
}

export function DrugDetailsBox({ selectedDrug, caseData, patientAllergies = [] }: DrugDetailsBoxProps) {
  const d = selectedDrug;

  const pbsLine = d
    ? d.pbs_code
      ? `${d.supply_type}: ${d.pbs_code}`
      : d.supply_type
    : "—";

  const scheduleLine = d?.schedule ?? "—";
  const mfrLine      = d?.manufacturer_full ?? d?.manufacturer_code ?? "—";
  const costLine     = d?.ws_cost  != null ? `$${d.ws_cost.toFixed(2)}`   : "—";
  const retailLine   = d?.retail_price != null ? `$${d.retail_price.toFixed(2)}` : "—";

  // Fallback allergy alert: check typed drug against case drugDetails for PDL warnings
  const dd = caseData.drugDetails;

  return (
    <div className="fred-drug-details">
      <div className="fred-dd-title">{d ? d.full_display_name : "Drug Details"}</div>

      <div className="fred-dd-row">
        <strong>Schedule:</strong>{" "}
        <span className="fred-dd-blue">{scheduleLine}</span>
      </div>
      <div className="fred-dd-row">
        <strong>PBS:</strong>{" "}
        <span className="fred-dd-blue">{pbsLine}</span>
      </div>
      <div className="fred-dd-row">
        <strong>Manufacturer:</strong>{" "}
        <span className="fred-dd-green">{mfrLine}</span>
      </div>
      <div className="fred-dd-row">
        <strong>Cost:</strong> {costLine}
      </div>
      <div className="fred-dd-row">
        <strong>Retail:</strong> {retailLine}
      </div>
      {d && (
        <div className="fred-dd-row">
          <strong>CMI:</strong> {d.cmi_available ? "Available" : "N/A"}
        </div>
      )}

      {/* PDL warnings from the case (drug-interaction / safety flags) */}
      {dd.warn1 && <div className="fred-dd-warn">{dd.warn1}</div>}
      {dd.warn2 && <div className="fred-dd-warn">{dd.warn2}</div>}

      {patientAllergies.length > 0 && (
        <div className="fred-dd-allergy">
          ⚠ Patient allergies: {patientAllergies.join(", ")}
        </div>
      )}
    </div>
  );
}
