"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient, PatientFormData } from "@/lib/types/patient";

interface Props {
  open: boolean;
  mode: "add" | "view";
  patient?: Patient;
  initialSurname?: string;
  onSave: (patient: Patient) => void;
  onClose: () => void;
}

const EMPTY: PatientFormData = {
  surname: "",
  firstname: "",
  title: "MR",
  sex: "M",
  dateOfBirth: "",
  address: "",
  suburb: "",
  postcode: "",
  phone: "",
  medicareCard: "",
  medicareValidTo: "",
  concessionType: "",
  concessionNumber: "",
  concessionValidTo: "",
  allergies: "",
  patientNotes: "",
};

function patientToForm(p: Patient): PatientFormData {
  return {
    surname: p.surname,
    firstname: p.firstname,
    title: p.title ?? "",
    sex: p.sex ?? "M",
    dateOfBirth: p.date_of_birth ?? "",
    address: p.address ?? "",
    suburb: p.suburb ?? "",
    postcode: p.postcode ?? "",
    phone: p.phone ?? "",
    medicareCard: p.medicare_card ?? "",
    medicareValidTo: p.medicare_valid_to ?? "",
    concessionType: p.concession_type ?? "",
    concessionNumber: p.concession_number ?? "",
    concessionValidTo: p.concession_valid_to ?? "",
    allergies: (p.allergies ?? []).join("\n"),
    patientNotes: p.patient_notes ?? "",
  };
}

export function PatientDetailsModal({
  open,
  mode,
  patient,
  initialSurname,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] = useState<PatientFormData>(() => {
    if (mode === "view" && patient) return patientToForm(patient);
    const f = { ...EMPTY };
    if (initialSurname) f.surname = initialSurname;
    return f;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!open) return null;

  const readOnly = mode === "view";

  function set(field: keyof PatientFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.surname.trim()) errs.surname = "Required";
    if (!form.firstname.trim()) errs.firstname = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("patients")
      .insert({
        surname: form.surname.trim().toUpperCase(),
        firstname: form.firstname.trim().toUpperCase(),
        title: form.title?.trim() || null,
        sex: form.sex || null,
        date_of_birth: form.dateOfBirth?.trim() || null,
        address: form.address?.trim().toUpperCase() || null,
        suburb: form.suburb?.trim().toUpperCase() || null,
        postcode: form.postcode?.trim() || null,
        phone: form.phone?.trim() || null,
        medicare_card: form.medicareCard?.trim() || null,
        medicare_valid_to: form.medicareValidTo?.trim() || null,
        concession_type: form.concessionType?.trim() || null,
        concession_number: form.concessionNumber?.trim() || null,
        concession_valid_to: form.concessionValidTo?.trim() || null,
        allergies: form.allergies
          ? form.allergies
              .split(/[\n,;]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        patient_notes: form.patientNotes?.trim() || null,
      })
      .select("*")
      .single();

    setSaving(false);
    if (error) {
      setSaveError(`Save failed: ${error.message}`);
      return;
    }
    onSave(data as Patient);
  }

  const headerName =
    mode === "view" && patient
      ? `${patient.surname}, ${patient.firstname}`
      : form.surname || form.firstname
      ? `${form.surname}${form.firstname ? ", " + form.firstname : ""}`
      : "New Patient";

  function Field({
    label,
    field,
    placeholder,
    width,
  }: {
    label: string;
    field: keyof PatientFormData;
    placeholder?: string;
    width?: string;
  }) {
    return (
      <div className="fred-pdtl-field" style={width ? { gridColumn: `span ${width}` } : undefined}>
        <div className="fred-pdtl-label">{label}</div>
        <input
          className={`fred-pdtl-input${errors[field] ? " error" : ""}`}
          value={(form[field] as string) ?? ""}
          onChange={(e) => set(field, e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
        />
        {errors[field] && (
          <div className="fred-pdtl-err-msg">{errors[field]}</div>
        )}
      </div>
    );
  }

  return (
    <div
      className="fred-pdtl-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fred-pdtl-dialog">
        <div className="fred-pdtl-title">
          <span>
            {mode === "add" ? "Add New Patient" : "Patient Details"}
          </span>
          <button
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
            }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="fred-pdtl-yellow-bar">
          <strong>{headerName}</strong>
          {form.dateOfBirth && (
            <span style={{ fontSize: "10px", color: "#555" }}>
              DOB: {form.dateOfBirth}
            </span>
          )}
        </div>

        <div className="fred-pdtl-body">
          {/* Decorative toolbar buttons */}
          <div className="fred-pdtl-deco-row" style={{ marginBottom: "6px" }}>
            {["Preferred Items", "Drug Interactions", "Patient Profile", "Scripts"].map(
              (lbl) => (
                <button key={lbl} className="fred-pdtl-deco-btn" tabIndex={-1}>
                  {lbl}
                </button>
              )
            )}
          </div>

          {/* Name row */}
          <div className="fred-pdtl-grid-4">
            <div className="fred-pdtl-field">
              <div className="fred-pdtl-label">Title</div>
              <select
                className="fred-pdtl-select"
                value={form.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
                disabled={readOnly}
              >
                {["MR", "MRS", "MS", "MISS", "DR", "MASTER"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="fred-pdtl-field">
              <div className="fred-pdtl-label">Surname *</div>
              <input
                className={`fred-pdtl-input${errors.surname ? " error" : ""}`}
                value={form.surname}
                onChange={(e) => set("surname", e.target.value.toUpperCase())}
                readOnly={readOnly}
                placeholder="SURNAME"
              />
              {errors.surname && (
                <div className="fred-pdtl-err-msg">{errors.surname}</div>
              )}
            </div>
            <div className="fred-pdtl-field">
              <div className="fred-pdtl-label">Firstname *</div>
              <input
                className={`fred-pdtl-input${errors.firstname ? " error" : ""}`}
                value={form.firstname}
                onChange={(e) => set("firstname", e.target.value.toUpperCase())}
                readOnly={readOnly}
                placeholder="FIRSTNAME"
              />
              {errors.firstname && (
                <div className="fred-pdtl-err-msg">{errors.firstname}</div>
              )}
            </div>
            <div className="fred-pdtl-field">
              <div className="fred-pdtl-label">Sex</div>
              <select
                className="fred-pdtl-select"
                value={form.sex ?? ""}
                onChange={(e) => set("sex", e.target.value)}
                disabled={readOnly}
              >
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          {/* DOB + Phone */}
          <div className="fred-pdtl-grid-3">
            <Field label="Date of Birth" field="dateOfBirth" placeholder="DD/MM/YYYY" />
            <Field label="Phone" field="phone" placeholder="(00) 0000 0000" />
            <div />
          </div>

          {/* Address */}
          <div className="fred-pdtl-section">
            <div className="fred-pdtl-section-title">Address</div>
            <div className="fred-pdtl-grid-2">
              <Field label="Street Address" field="address" placeholder="1 MAIN STREET" />
              <Field label="Suburb" field="suburb" placeholder="SUBURB" />
            </div>
            <div className="fred-pdtl-grid-3">
              <Field label="Postcode" field="postcode" placeholder="0000" />
              <div />
              <div />
            </div>
          </div>

          {/* Medicare */}
          <div className="fred-pdtl-section">
            <div className="fred-pdtl-section-title">Medicare / Concession</div>
            <div className="fred-pdtl-grid-3">
              <Field label="Medicare Card No." field="medicareCard" placeholder="XXXX-XXXXX-X" />
              <Field label="Valid To (MM/YYYY)" field="medicareValidTo" placeholder="MM/YYYY" />
              <div />
            </div>
            <div className="fred-pdtl-grid-3">
              <div className="fred-pdtl-field">
                <div className="fred-pdtl-label">Concession Type</div>
                <select
                  className="fred-pdtl-select"
                  value={form.concessionType ?? ""}
                  onChange={(e) => set("concessionType", e.target.value)}
                  disabled={readOnly}
                >
                  <option value="">None</option>
                  <option value="C">C — Concession</option>
                  <option value="S">S — Safety Net</option>
                  <option value="P">P — Pension</option>
                </select>
              </div>
              <Field label="Concession Number" field="concessionNumber" placeholder="C 400 000 000A" />
              <Field label="Valid To" field="concessionValidTo" placeholder="MM/YYYY" />
            </div>
          </div>

          {/* Allergies + Notes */}
          <div className="fred-pdtl-grid-2">
            <div className="fred-pdtl-field">
              <div className="fred-pdtl-label">Allergies (one per line)</div>
              <textarea
                className="fred-pdtl-textarea"
                value={form.allergies ?? ""}
                onChange={(e) => set("allergies", e.target.value)}
                placeholder="PENICILLIN (rash)"
                readOnly={readOnly}
              />
            </div>
            <div className="fred-pdtl-field">
              <div className="fred-pdtl-label">Patient Notes</div>
              <textarea
                className="fred-pdtl-textarea"
                value={form.patientNotes ?? ""}
                onChange={(e) => set("patientNotes", e.target.value)}
                placeholder="Relevant medical history..."
                readOnly={readOnly}
              />
            </div>
          </div>

          {saveError && (
            <div
              style={{
                color: "#cc0000",
                fontSize: "11px",
                marginTop: "4px",
                padding: "4px",
                background: "#fff0f0",
                border: "1px solid #cc0000",
              }}
            >
              {saveError}
            </div>
          )}
        </div>

        <div className="fred-pdtl-footer">
          <button className="fred-pdtl-btn" onClick={onClose}>
            Cancel
          </button>
          {mode === "add" && (
            <button
              className="fred-pdtl-btn fred-pdtl-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Patient"}
            </button>
          )}
          {mode === "view" && (
            <button className="fred-pdtl-btn" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
