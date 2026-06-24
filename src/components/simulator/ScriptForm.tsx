import { expandAbbrevs } from "@/lib/scoring/abbreviations";
import type { FormState, FormAction } from "@/components/simulator/state";

interface ScriptFormProps {
  formState: FormState;
  dispatch: React.Dispatch<FormAction>;
  initialsError: boolean;
}

function onChange(
  dispatch: React.Dispatch<FormAction>,
  name: keyof FormState
) {
  return (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => dispatch({ type: "SET_FIELD", field: name, value: e.target.value });
}

export function ScriptForm({ formState, dispatch, initialsError }: ScriptFormProps) {

  const initialsDisplay = formState.pharmacistInitials.trim() || "__";
  const expandedDirections = expandAbbrevs(formState.directions);

  return (
    <div className="fred-script-left">
      <div className="fred-script-title">New Script</div>

      {/* Row 1: Date / Type / Hospital */}
      <div className="grid grid-cols-3 gap-1.5 mb-1 px-1">
        <div>
          <label className="fred-field-label">Script Date</label>
          <input
            className="fred-field-input"
            placeholder="DD/MM/YY"
            value={formState.scriptDate}
            onChange={onChange(dispatch, "scriptDate")}
          />
        </div>
        <div>
          <label className="fred-field-label">Script Type</label>
          <select
            className="fred-field-select"
            value={formState.scriptType}
            onChange={onChange(dispatch, "scriptType")}
          >
            <option>N — NHS</option>
            <option>P — Private</option>
            <option>R — Repeat</option>
            <option>S — Safety Net</option>
            <option>C — Concession</option>
          </select>
        </div>
        <div>
          <label className="fred-field-label">Hospital Prov. No.</label>
          <input
            className="fred-field-input"
            placeholder=""
            value={formState.hospitalProvNo}
            onChange={onChange(dispatch, "hospitalProvNo")}
          />
        </div>
      </div>

      {/* Row 2: Doctor / Prescriber No */}
      <div className="grid grid-cols-2 gap-1.5 mb-1 px-1">
        <div>
          <label className="fred-field-label">Medical Doctor</label>
          <input
            className="fred-field-input"
            placeholder="Doctor surname, first"
            value={formState.doctor}
            onChange={onChange(dispatch, "doctor")}
          />
        </div>
        <div>
          <label className="fred-field-label">Prescriber No.</label>
          <input
            className="fred-field-input"
            placeholder="Prescriber No."
            value={formState.prescriberNo}
            onChange={onChange(dispatch, "prescriberNo")}
          />
        </div>
      </div>

      {/* Drug field */}
      <div className="px-1 mb-1">
        <label className="fred-field-label">Drug or Repeat No</label>
        <input
          className="fred-field-input"
          placeholder="Type drug name, strength and form..."
          value={formState.drug}
          onChange={onChange(dispatch, "drug")}
        />
        <div className="fred-drug-info-row">
          <span>
            On Hand: <span>—</span>
          </span>
          <span>
            Committed: <span>0.00</span>
          </span>
          <span>
            Avail Stock: <span>—</span>
          </span>
          <span style={{ color: "#006600", fontWeight: "bold" }}>$0.00</span>
        </div>
      </div>

      {/* Abbreviation reference */}
      <div className="fred-abbrev-ref mx-1 mb-1">
        <strong>Direction abbreviations:</strong>{" "}
        od=once daily &nbsp; bd=twice daily &nbsp; tds=3×/day &nbsp; qid=4×/day &nbsp;
        mane=morning &nbsp; nocte=night &nbsp; prn=as needed &nbsp; pc=after meals &nbsp;
        ac=before meals &nbsp; sos=if needed &nbsp; stat=immediately &nbsp; c=with
      </div>

      {/* Directions / Repeats / Qty / Price */}
      <div
        className="grid gap-1.5 mb-1 px-1"
        style={{ gridTemplateColumns: "1fr auto auto auto" }}
      >
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label">Directions</label>
          <textarea
            className="fred-dir-textarea"
            placeholder="e.g. Take ONE capsule tds pc"
            value={formState.directions}
            onChange={onChange(dispatch, "directions")}
          />
          {formState.directions && (
            <div
              style={{
                fontSize: "10px",
                color: "#555",
                fontStyle: "italic",
                marginTop: "1px",
              }}
            >
              {expandedDirections}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label">Repeats</label>
          <input
            className="fred-dir-col-input"
            placeholder="0"
            value={formState.repeats}
            onChange={onChange(dispatch, "repeats")}
          />
          <div style={{ fontSize: "9px", color: "#888" }}>Max —</div>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label">Quantity</label>
          <input
            className="fred-dir-col-input"
            placeholder="0"
            value={formState.qty}
            onChange={onChange(dispatch, "qty")}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label">Price</label>
          <input
            className="fred-dir-col-input"
            placeholder="0.00"
            value={formState.price}
            onChange={onChange(dispatch, "price")}
          />
        </div>
      </div>

      {/* Pharmacist initials */}
      <div className="fred-pharmacist-row">
        <span>Pharmacist Initials OK</span>
        <div
          className={`fred-initials-box${initialsError ? " fred-initials-shake" : ""}`}
        >
          {initialsDisplay}
        </div>
        <span>to proceed</span>
        <input
          style={{
            width: "50px",
            fontSize: "12px",
            border: initialsError ? "2px solid #cc0000" : "2px inset #888",
            padding: "2px 4px",
            fontFamily: "inherit",
          }}
          placeholder="Initials"
          maxLength={3}
          value={formState.pharmacistInitials}
          onChange={(e) =>
            dispatch({
              type: "SET_FIELD",
              field: "pharmacistInitials",
              value: e.target.value.toUpperCase(),
            })
          }
        />
      </div>
    </div>
  );
}
