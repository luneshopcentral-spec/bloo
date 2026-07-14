"use client";
import { useEffect, useRef, useState } from "react";
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

function initialPatientForm(
  mode: "add" | "view",
  patient?: Patient,
  initialSurname?: string
): PatientFormData {
  if (mode === "view" && patient) return patientToForm(patient);
  return { ...EMPTY, surname: initialSurname ?? "" };
}

interface PatientDetailFieldProps {
  label: string;
  field: keyof PatientFormData;
  form: PatientFormData;
  errors: Record<string, string>;
  placeholder?: string;
  width?: string;
  readOnly: boolean;
  onChange: (field: keyof PatientFormData, value: string) => void;
}

// This must stay at module scope. Defining it inside PatientDetailsModal gives
// React a new component type on every keystroke, which remounts the input and
// drops focus after each character.
function PatientDetailField({
  label,
  field,
  form,
  errors,
  placeholder,
  width,
  readOnly,
  onChange,
}: PatientDetailFieldProps) {
  const id = `patient-${field}`;
  return (
    <div className="fred-pdtl-field" style={width ? { gridColumn: `span ${width}` } : undefined}>
      <label className="fred-pdtl-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`fred-pdtl-input${errors[field] ? " error" : ""}`}
        value={(form[field] as string) ?? ""}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
      {errors[field] && <div className="fred-pdtl-err-msg">{errors[field]}</div>}
    </div>
  );
}

export function PatientDetailsModal({
  open,
  mode,
  patient,
  initialSurname,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] = useState<PatientFormData>(() =>
    initialPatientForm(mode, patient, initialSurname)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setForm(initialPatientForm(mode, patient, initialSurname));
      setErrors({});
      setSaving(false);
      setSaveError("");
    }
    wasOpenRef.current = open;
  }, [open, mode, patient, initialSurname]);

  if (!open) return null;

  const readOnly = mode === "view";

  function set(field: keyof PatientFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  const patientFieldProps = { form, errors, readOnly, onChange: set };

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.surname.trim()) errs.surname = "Required";
    if (!form.firstname.trim()) errs.firstname = "Required";
    if (!form.address?.trim()) errs.address = "Required";
    if (!form.suburb?.trim()) errs.suburb = "Required";
    if (!form.postcode?.trim()) errs.postcode = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError("");

    // Practice patients belong to this attempt only. Writing synthetic exam
    // data into the shared Supabase directory would pollute every user's search.
    const practicePatient: Patient = {
      id: crypto.randomUUID(),
      seed_id: null,
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
    };

    setSaving(false);
    onSave(practicePatient);
  }

  const headerName =
    mode === "view" && patient
      ? `${patient.surname}, ${patient.firstname}`
      : form.surname || form.firstname
      ? `${form.surname}${form.firstname ? ", " + form.firstname : ""}`
      : "New Patient";

  return (
    <div
      className="fred-pdtl-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fred-pdtl-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-details-title"
      >
        <div className="fred-pdtl-title">
          <span id="patient-details-title">
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
            aria-label="Close patient details"
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
              <label className="fred-pdtl-label" htmlFor="patient-title">Title</label>
              <select
                id="patient-title"
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
              <label className="fred-pdtl-label" htmlFor="patient-surname">Surname *</label>
              <input
                id="patient-surname"
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
              <label className="fred-pdtl-label" htmlFor="patient-firstname">Firstname *</label>
              <input
                id="patient-firstname"
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
              <label className="fred-pdtl-label" htmlFor="patient-sex">Sex</label>
              <select
                id="patient-sex"
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
            <PatientDetailField {...patientFieldProps} label="Date of Birth" field="dateOfBirth" placeholder="DD/MM/YYYY" />
            <PatientDetailField {...patientFieldProps} label="Phone" field="phone" placeholder="(00) 0000 0000" />
            <div />
          </div>

          {/* Address */}
          <div className="fred-pdtl-section">
            <div className="fred-pdtl-section-title">Address</div>
            <div className="fred-pdtl-grid-2">
              <PatientDetailField {...patientFieldProps} label="Street Address" field="address" placeholder="1 MAIN STREET" />
              <PatientDetailField {...patientFieldProps} label="Suburb" field="suburb" placeholder="SUBURB" />
            </div>
            <div className="fred-pdtl-grid-3">
              <PatientDetailField {...patientFieldProps} label="Postcode" field="postcode" placeholder="0000" />
              <div />
              <div />
            </div>
          </div>

          {/* Medicare */}
          <div className="fred-pdtl-section">
            <div className="fred-pdtl-section-title">Medicare / Concession</div>
            <div className="fred-pdtl-grid-3">
              <PatientDetailField {...patientFieldProps} label="Medicare Card No." field="medicareCard" placeholder="XXXX-XXXXX-X" />
              <PatientDetailField {...patientFieldProps} label="Valid To (MM/YYYY)" field="medicareValidTo" placeholder="MM/YYYY" />
              <div />
            </div>
            <div className="fred-pdtl-grid-3">
              <div className="fred-pdtl-field">
                <label className="fred-pdtl-label" htmlFor="patient-concession-type">Concession Type</label>
                <select
                  id="patient-concession-type"
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
              <PatientDetailField {...patientFieldProps} label="Concession Number" field="concessionNumber" placeholder="C 400 000 000A" />
              <PatientDetailField {...patientFieldProps} label="Valid To" field="concessionValidTo" placeholder="MM/YYYY" />
            </div>
          </div>

          {/* Allergies + Notes */}
          <div className="fred-pdtl-grid-2">
            <div className="fred-pdtl-field">
              <label className="fred-pdtl-label" htmlFor="patient-allergies">Allergies (one per line)</label>
              <textarea
                id="patient-allergies"
                className="fred-pdtl-textarea"
                value={form.allergies ?? ""}
                onChange={(e) => set("allergies", e.target.value)}
                placeholder="PENICILLIN (rash)"
                readOnly={readOnly}
              />
            </div>
            <div className="fred-pdtl-field">
              <label className="fred-pdtl-label" htmlFor="patient-notes">Patient Notes</label>
              <textarea
                id="patient-notes"
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
