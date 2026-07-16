import { expandAbbrevs } from "@/lib/scoring/abbreviations";
import type { PracticeCase } from "@/lib/types/case";
import type { FormState } from "@/components/simulator/state";

interface LabelPreviewProps {
  caseData: PracticeCase;
  formState: FormState;
  selectedWarnings: Set<string>;
  patientName?: string;
  /** Which prescribed item this label is for. */
  itemIndex: number;
  itemCount: number;
}

export function LabelPreview({
  caseData,
  formState,
  selectedWarnings,
  patientName,
  itemIndex,
  itemCount,
}: LabelPreviewProps) {
  const itemForm = formState.items[itemIndex];
  const drug = itemForm?.drug || "—";
  const directions = itemForm?.directions
    ? expandAbbrevs(itemForm.directions)
    : "—";
  const date = formState.scriptDate || caseData.date;
  const doctor = formState.doctor || caseData.doctor;
  const qty = itemForm?.qty || "—";
  const repeats = itemForm?.repeats || "—";
  const price = itemForm?.price ? `$${itemForm.price}` : "$—";
  const warnList = Array.from(selectedWarnings).join(", ");

  return (
    <div>
      <div className="fred-label-section-title">
        {itemCount > 1
          ? `— Script Label · Item ${itemIndex + 1} of ${itemCount} —`
          : "— Script Label —"}
      </div>
      <div className="fred-label-box">
        <div className="fred-label-drug">{drug}</div>
        <div style={{ marginTop: "2px", fontSize: "11px" }}>{directions}</div>
        <div className="fred-label-bottom">
          <div>
            <div style={{ fontWeight: "bold" }}>{patientName || "—"}</div>
            <div style={{ fontSize: "10px", color: "#555" }}>
              {date} &nbsp; Dr {doctor}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>
              Qty {qty} | {repeats} Rpt
            </div>
            <div style={{ fontSize: "10px" }}>{price}</div>
          </div>
        </div>
        {warnList && (
          <div
            style={{
              marginTop: "4px",
              fontSize: "10px",
              color: "#555",
              borderTop: "1px solid #aaa",
              paddingTop: "2px",
            }}
          >
            {warnList}
          </div>
        )}
      </div>
    </div>
  );
}
