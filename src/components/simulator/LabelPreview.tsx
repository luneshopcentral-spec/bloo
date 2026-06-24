import { expandAbbrevs } from "@/lib/scoring/abbreviations";
import type { PracticeCase } from "@/lib/types/case";
import type { FormState } from "@/components/simulator/state";

interface LabelPreviewProps {
  caseData: PracticeCase;
  formState: FormState;
  selectedWarnings: Set<string>;
}

export function LabelPreview({ caseData, formState, selectedWarnings }: LabelPreviewProps) {
  const drug = formState.drug || "—";
  const directions = formState.directions
    ? expandAbbrevs(formState.directions)
    : "—";
  const date = formState.scriptDate || caseData.date;
  const doctor = formState.doctor || caseData.doctor;
  const qty = formState.qty || "—";
  const repeats = formState.repeats || "—";
  const price = formState.price ? `$${formState.price}` : "$—";
  const warnList = [...selectedWarnings].join(", ");

  return (
    <div>
      <div className="fred-label-section-title">— Script Label —</div>
      <div className="fred-label-box">
        <div className="fred-label-drug">{drug}</div>
        <div style={{ marginTop: "2px", fontSize: "11px" }}>{directions}</div>
        <div className="fred-label-bottom">
          <div>
            <div style={{ fontWeight: "bold" }}>{caseData.patient}</div>
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
