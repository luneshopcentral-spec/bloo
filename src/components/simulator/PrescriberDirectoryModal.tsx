"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mergeWithLocal, searchLocalPrescribers } from "@/lib/directory/local-fallback";
import type { Prescriber, PrescriberFormData } from "@/lib/types/prescriber";

interface Props {
  open: boolean;
  query: string;
  onSelect: (prescriber: Prescriber) => void;
  onClose: () => void;
}

const EMPTY_FORM: PrescriberFormData = {
  title: "DR",
  surname: "",
  firstname: "",
  prescriberNumber: "",
  practiceName: "",
  address: "",
  suburb: "",
  state: "NSW",
  postcode: "",
  phone: "",
};

interface DirectoryFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

function DirectoryField({ id, label, value, onChange, error, placeholder }: DirectoryFieldProps) {
  return (
    <div className="fred-prdtl-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={error ? "error" : ""}
        placeholder={placeholder}
      />
      {error && <span>{error}</span>}
    </div>
  );
}

export function PrescriberDirectoryModal({ open, query, onSelect, onClose }: Props) {
  const [internalQuery, setInternalQuery] = useState(query);
  const [prescribers, setPrescribers] = useState<Prescriber[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"directory" | "add">("directory");
  const [form, setForm] = useState<PrescriberFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;
    setInternalQuery(query);
    setSelectedIndex(0);
    setMode("directory");
    setError("");
    setForm({ ...EMPTY_FORM, surname: query.toUpperCase() });
    setFormErrors({});
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open, query]);

  async function search(value: string) {
    const safe = value.replace(/[^a-zA-Z0-9 '-]/g, "").trim();
    setLoading(true);
    setError("");
    const supabase = createClient();
    let request = supabase.from("prescribers").select("*");
    if (safe) {
      request = request.or(
        `surname.ilike.${safe}%,firstname.ilike.${safe}%,practice_name.ilike.%${safe}%,prescriber_number.ilike.${safe}%`
      );
    }
    const { data, error: fetchError } = await request
      .order("surname")
      .order("firstname")
      .limit(30);
    setLoading(false);
    // Bundled prescribers back the search so case prescribers are always findable.
    setPrescribers(mergeWithLocal(
      (fetchError ? [] : (data as Prescriber[])) ?? [],
      searchLocalPrescribers(safe),
      30
    ));
    setSelectedIndex(0);
  }

  useEffect(() => {
    if (!open || mode !== "directory") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(internalQuery), 200);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, internalQuery, mode]);

  function setField(field: keyof PrescriberFormData, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: "" }));
  }

  function openAddForm() {
    setForm({ ...EMPTY_FORM, surname: internalQuery.toUpperCase() });
    setFormErrors({});
    setError("");
    setMode("add");
  }

  async function savePrescriber() {
    const errors: Record<string, string> = {};
    if (!form.surname.trim()) errors.surname = "Required";
    if (!form.firstname.trim()) errors.firstname = "Required";
    const prescriberNumber = form.prescriberNumber.replace(/\D/g, "");
    if (!prescriberNumber) errors.prescriberNumber = "Required";
    else if (!/^\d{7}$/.test(prescriberNumber)) errors.prescriberNumber = "Enter the 7-digit number";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const payload = {
      seed_id: null,
      title: form.title.trim().toUpperCase() || null,
      surname: form.surname.trim().toUpperCase(),
      firstname: form.firstname.trim().toUpperCase(),
      prescriber_number: prescriberNumber,
      practice_name: form.practiceName.trim() || null,
      address: form.address.trim() || null,
      suburb: form.suburb.trim().toUpperCase() || null,
      state: form.state.trim().toUpperCase() || null,
      postcode: form.postcode.trim() || null,
      phone: form.phone.trim() || null,
    };
    const { data, error: insertError } = await supabase
      .from("prescribers")
      // Supabase's hand-maintained schema currently resolves this insert
      // overload to never even though payload matches Database.Insert.
      .insert(payload as never)
      .select("*")
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(
        insertError?.code === "23505"
          ? "That prescriber number is already in the directory. Return to the directory and search by number."
          : insertError?.message ?? "The prescriber could not be saved."
      );
      return;
    }
    onSelect(data as Prescriber);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") return onClose();
    if (event.key === "ArrowDown") {
      event.preventDefault();
      return setSelectedIndex((index) => Math.min(index + 1, prescribers.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      return setSelectedIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (selectedIndex === 0) openAddForm();
      else if (prescribers[selectedIndex - 1]) onSelect(prescribers[selectedIndex - 1]);
    }
  }

  if (!open) return null;

  return (
    <div className="fred-prsel-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="fred-prsel-dialog" role="dialog" aria-modal="true" aria-labelledby="prescriber-directory-title">
        <div className="fred-prsel-title">
          <span id="prescriber-directory-title">{mode === "add" ? "Add New Prescriber" : "Prescriber Directory"}</span>
          <button type="button" onClick={onClose} aria-label="Close prescriber directory">×</button>
        </div>

        {mode === "directory" ? (
          <>
            <div className="fred-prsel-search-row">
              <label htmlFor="prescriber-search">Name / number:</label>
              <input
                id="prescriber-search"
                ref={inputRef}
                value={internalQuery}
                onChange={(event) => setInternalQuery(event.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Surname, first name, practice or prescriber number"
                autoComplete="off"
              />
              {loading && <span>Searching…</span>}
            </div>
            <div className="fred-prsel-head">
              <span></span><span>Surname</span><span>Firstname</span><span>Prescriber No.</span><span>Practice</span><span>Location</span>
            </div>
            <div className="fred-prsel-body" role="listbox" aria-label="Prescriber search results">
              <div
                className={`fred-prsel-row add${selectedIndex === 0 ? " selected" : ""}`}
                onMouseEnter={() => setSelectedIndex(0)}
                onClick={openAddForm}
              >
                <span></span><span className="wide">&lt; Add New Prescriber &gt;</span>
              </div>
              {error && <div className="fred-prsel-error">{error}</div>}
              {!error && !loading && prescribers.length === 0 && <div className="fred-prsel-empty">No matching prescribers.</div>}
              {prescribers.map((prescriber, index) => {
                const rowIndex = index + 1;
                return (
                  <div
                    key={prescriber.id}
                    className={`fred-prsel-row${selectedIndex === rowIndex ? " selected" : ""}`}
                    role="option"
                    aria-selected={selectedIndex === rowIndex}
                    onMouseEnter={() => setSelectedIndex(rowIndex)}
                    onClick={() => setSelectedIndex(rowIndex)}
                    onDoubleClick={() => onSelect(prescriber)}
                  >
                    <span>{String.fromCharCode(97 + index)}</span>
                    <span>{prescriber.surname}</span>
                    <span>{prescriber.firstname}</span>
                    <span>{prescriber.prescriber_number}</span>
                    <span>{prescriber.practice_name ?? "—"}</span>
                    <span>{[prescriber.suburb, prescriber.state].filter(Boolean).join(" ") || "—"}</span>
                  </div>
                );
              })}
            </div>
            <div className="fred-prsel-footer">
              <span>Enter or double-click selects · Add New stores the prescriber in the shared directory</span>
              <button type="button" onClick={() => selectedIndex > 0 && onSelect(prescribers[selectedIndex - 1])} disabled={selectedIndex === 0}>
                Select prescriber
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="fred-prdtl-grid">
              <DirectoryField id="prescriber-surname" label="Surname *" value={form.surname} onChange={(value) => setField("surname", value.toUpperCase())} error={formErrors.surname} />
              <DirectoryField id="prescriber-firstname" label="First name *" value={form.firstname} onChange={(value) => setField("firstname", value.toUpperCase())} error={formErrors.firstname} />
              <DirectoryField id="new-prescriber-number" label="Prescriber number *" value={form.prescriberNumber} onChange={(value) => setField("prescriberNumber", value)} error={formErrors.prescriberNumber} />
              <DirectoryField id="prescriber-practice" label="Practice name" value={form.practiceName} onChange={(value) => setField("practiceName", value)} />
              <DirectoryField id="prescriber-address" label="Street address" value={form.address} onChange={(value) => setField("address", value)} />
              <DirectoryField id="prescriber-suburb" label="Suburb" value={form.suburb} onChange={(value) => setField("suburb", value.toUpperCase())} />
              <DirectoryField id="prescriber-state" label="State" value={form.state} onChange={(value) => setField("state", value.toUpperCase())} placeholder="NSW" />
              <DirectoryField id="prescriber-postcode" label="Postcode" value={form.postcode} onChange={(value) => setField("postcode", value)} />
              <DirectoryField id="prescriber-phone" label="Phone" value={form.phone} onChange={(value) => setField("phone", value)} />
            </div>
            {error && <div className="fred-prsel-error">{error}</div>}
            <div className="fred-prsel-footer">
              <button type="button" onClick={() => setMode("directory")}>Back to directory</button>
              <button type="button" onClick={() => void savePrescriber()} disabled={saving}>
                {saving ? "Saving…" : "Save and select prescriber"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
