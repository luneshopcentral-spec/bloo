import { useRef } from "react";
import { expandAbbrevs } from "@/lib/scoring/abbreviations";
import type { FormState, FormAction } from "@/components/simulator/state";
import type { DrugRow } from "@/lib/types/drug";
import type { Prescriber } from "@/lib/types/prescriber";
import type { PracticeCase } from "@/lib/types/case";

interface ScriptFormProps {
  formState: FormState;
  dispatch: React.Dispatch<FormAction>;
  initialsError: boolean;
  disabled?: boolean;
  selectedDrug: DrugRow | null;
  onOpenDrugModal: (query: string) => void;
  selectedPrescriber: Prescriber | null;
  onOpenPrescriberModal: (query: string) => void;
  authorityRequirement?: PracticeCase["authority"];
}

function onChange(dispatch: React.Dispatch<FormAction>, name: keyof FormState) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    dispatch({ type: "SET_FIELD", field: name, value: e.target.value });
}

export function ScriptForm({
  formState,
  dispatch,
  initialsError,
  disabled = false,
  selectedDrug,
  onOpenDrugModal,
  selectedPrescriber,
  onOpenPrescriberModal,
  authorityRequirement,
}: ScriptFormProps) {
  const initialsDisplay  = formState.pharmacistInitials.trim() || "__";
  const expandedDirections = expandAbbrevs(formState.directions);
  const drugDebounceRef  = useRef<ReturnType<typeof setTimeout>>(undefined);
  const controlledDrugSelected = /\bS8\b/i.test(selectedDrug?.schedule ?? "");

  function handleDrugInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    dispatch({ type: "SET_FIELD", field: "drug", value: val });
    clearTimeout(drugDebounceRef.current);
    if (val.trim().length >= 2) {
      drugDebounceRef.current = setTimeout(() => onOpenDrugModal(val.trim()), 200);
    }
  }

  const drugInfoLine = selectedDrug
    ? `→ ${selectedDrug.full_display_name} · ${selectedDrug.manufacturer_full ?? selectedDrug.manufacturer_code ?? "—"} · ${selectedDrug.supply_type}${selectedDrug.pbs_code ? ` ${selectedDrug.pbs_code}` : ""} · $${(selectedDrug.retail_price ?? 0).toFixed(2)}`
    : null;

  return (
    <div className={`fred-script-left${disabled ? " fred-script-disabled" : ""}`}>
      <div className="fred-script-title">New Script</div>

      {/* Row 1: Date / Type / Hospital */}
      <div className="grid grid-cols-3 gap-1.5 mb-1 px-1">
        <div>
          <label className="fred-field-label" htmlFor="script-date">Script Date</label>
          <input id="script-date" className="fred-field-input" placeholder="DD/MM/YY"
            value={formState.scriptDate} onChange={onChange(dispatch, "scriptDate")} disabled={disabled} />
        </div>
        <div>
          <label className="fred-field-label" htmlFor="script-type">Script Type</label>
          <select id="script-type" className="fred-field-select" value={formState.scriptType}
            onChange={onChange(dispatch, "scriptType")} disabled={disabled}>
            <option>N — NHS</option>
            <option>P — Private</option>
            <option>R — Repeat</option>
            <option>S — Safety Net</option>
            <option>C — Concession</option>
          </select>
        </div>
        <div>
          <label className="fred-field-label" htmlFor="hospital-provider-number">Hospital Prov. No.</label>
          <input id="hospital-provider-number" className="fred-field-input" value={formState.hospitalProvNo}
            onChange={onChange(dispatch, "hospitalProvNo")} disabled={disabled} />
        </div>
      </div>

      {/* Row 2: Doctor / Prescriber No */}
      <div className="grid grid-cols-2 gap-1.5 mb-1 px-1">
        <div>
          <label className="fred-field-label" htmlFor="medical-doctor">Medical Doctor</label>
          <div className="fred-directory-field">
            <input id="medical-doctor" className="fred-field-input" placeholder="Doctor surname, first"
              value={formState.doctor} onChange={onChange(dispatch, "doctor")} disabled={disabled || !!selectedPrescriber} />
            <button type="button" onClick={() => onOpenPrescriberModal(formState.doctor)} disabled={disabled}>
              {selectedPrescriber ? "Change" : "Directory"}
            </button>
          </div>
        </div>
        <div>
          <label className="fred-field-label" htmlFor="prescriber-number">Prescriber No.</label>
          <input id="prescriber-number" className="fred-field-input" placeholder="Prescriber No."
            value={formState.prescriberNo} readOnly disabled={disabled} />
        </div>
      </div>

      {/* Drug field */}
      <div className="px-1 mb-1">
        <label className="fred-field-label" htmlFor="drug-search">Brand / Product or Repeat No</label>

        {selectedDrug ? (
          <div className="fred-drug-selected-wrap">
            <span className="fred-drug-selected-name">
              <span className={`fred-product-kind ${selectedDrug.is_generic ? "generic" : "brand"}`}>
                {selectedDrug.is_generic ? "GENERIC" : "BRAND"}
              </span>
              {selectedDrug.full_display_name}
            </span>
            <button
              type="button"
              id="drug-search"
              className="fred-drug-change-btn"
              onClick={() => !disabled && onOpenDrugModal(selectedDrug.generic_name)}
              disabled={disabled}
            >
              Change
            </button>
          </div>
        ) : (
          <input
            id="drug-search"
            className="fred-field-input"
            placeholder="Type brand or generic name to search directory…"
            value={formState.drug}
            onChange={handleDrugInput}
            disabled={disabled}
          />
        )}

        {drugInfoLine && (
          <div className="fred-drug-info-line">{drugInfoLine}</div>
        )}

        <div className="fred-drug-info-row">
          <span>On Hand: <span>—</span></span>
          <span>Committed: <span>0.00</span></span>
          <span>Avail Stock: <span>—</span></span>
          <span style={{ color: "#006600", fontWeight: "bold" }}>$0.00</span>
        </div>
      </div>

      {controlledDrugSelected && (
        <div className="fred-authority-entry" role="group" aria-labelledby="authority-number-label">
          <div>
            <label id="authority-number-label" className="fred-field-label" htmlFor="authority-number">
              {authorityRequirement?.type === "streamlined"
                ? "Streamlined authority code"
                : "PBS authority approval number"}
            </label>
            <input
              id="authority-number"
              className="fred-field-input"
              placeholder={authorityRequirement?.type === "streamlined" ? "4 or 5 digit code" : "e.g. H1234RX"}
              value={formState.authorityNumber}
              onChange={onChange(dispatch, "authorityNumber")}
              disabled={disabled}
              autoComplete="off"
              aria-required={Boolean(authorityRequirement?.required)}
            />
          </div>
          <p>
            Transcribe this from the authority prescription. It is separate from the pharmacy PBS approval number.
            {authorityRequirement?.required ? " This case cannot proceed until it is entered." : ""}
          </p>
        </div>
      )}

      {/* Abbreviation reference */}
      <div className="fred-abbrev-ref mx-1 mb-1">
        <strong>Direction abbreviations:</strong>{" "}
        od=once daily &nbsp; bd=twice daily &nbsp; tds=3×/day &nbsp; qid=4×/day &nbsp;
        mane=morning &nbsp; nocte=night &nbsp; prn=as needed &nbsp; pc=after meals &nbsp;
        ac=before meals &nbsp; sos=if needed &nbsp; stat=immediately &nbsp; c=with
      </div>

      {/* Directions / Repeats / Qty / Price */}
      <div className="grid gap-1.5 mb-1 px-1" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label" htmlFor="directions">Directions</label>
          <textarea id="directions" className="fred-dir-textarea" placeholder="e.g. Take ONE capsule tds pc"
            value={formState.directions} onChange={onChange(dispatch, "directions")} disabled={disabled} />
          {formState.directions && (
            <div style={{ fontSize: "10px", color: "#555", fontStyle: "italic", marginTop: "1px" }}>
              {expandedDirections}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label" htmlFor="repeats">Repeats</label>
          <input id="repeats" className="fred-dir-col-input" placeholder="0" inputMode="numeric"
            value={formState.repeats} onChange={onChange(dispatch, "repeats")} disabled={disabled} />
          <div style={{ fontSize: "9px", color: "#888" }}>Max —</div>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label" htmlFor="quantity">Quantity</label>
          <input id="quantity" className="fred-dir-col-input" placeholder="0" inputMode="decimal"
            value={formState.qty} onChange={onChange(dispatch, "qty")} disabled={disabled} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="fred-field-label" htmlFor="price">Price</label>
          <input id="price" className="fred-dir-col-input" placeholder="0.00" inputMode="decimal"
            value={formState.price} onChange={onChange(dispatch, "price")} disabled={disabled} />
        </div>
      </div>

      {/* Pharmacist initials */}
      <div className="fred-pharmacist-row">
        <label htmlFor="pharmacist-initials">Pharmacist Initials</label>
        <div className={`fred-initials-box${initialsError ? " fred-initials-shake" : ""}`}>
          {initialsDisplay}
        </div>
        <span>to proceed</span>
        <input
          id="pharmacist-initials"
          style={{
            width: "50px", fontSize: "12px",
            border: initialsError ? "2px solid #cc0000" : "2px inset #888",
            padding: "2px 4px", fontFamily: "inherit",
          }}
          placeholder="Initials"
          maxLength={3}
          aria-invalid={initialsError}
          autoComplete="off"
          value={formState.pharmacistInitials}
          onChange={(e) =>
            dispatch({ type: "SET_FIELD", field: "pharmacistInitials", value: e.target.value.toUpperCase() })
          }
        />
      </div>
    </div>
  );
}
