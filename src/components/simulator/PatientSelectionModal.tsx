"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@/lib/types/patient";

interface Props {
  open: boolean;
  initialSurname: string;
  onSelect: (patient: Patient) => void;
  onAddNew: (surname: string) => void;
  onClose: () => void;
}

export function PatientSelectionModal({
  open,
  initialSurname,
  onSelect,
  onAddNew,
  onClose,
}: Props) {
  const [query, setQuery] = useState(initialSurname);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open) {
      setQuery(initialSurname);
      setSelectedIndex(0);
      setPatients([]);
      setFetchError("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, initialSurname]);

  async function search(q: string) {
    if (!q.trim()) {
      setPatients([]);
      setLoading(false);
      setFetchError("");
      return;
    }
    setLoading(true);
    setFetchError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .ilike("surname", `${q}%`)
      .order("surname")
      .order("firstname")
      .limit(25);
    setLoading(false);
    if (error) {
      setFetchError(error.message);
      return;
    }
    setPatients((data as Patient[]) ?? []);
    setSelectedIndex(0);
  }

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 200);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const totalRows = 1 + patients.length;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, totalRows - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex === 0) {
        onAddNew(query);
      } else {
        const p = patients[selectedIndex - 1];
        if (p) onSelect(p);
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fred-psel-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="fred-psel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-selection-title"
      >
        <div className="fred-psel-title">
          <span id="patient-selection-title">Patient Selection</span>
          <button className="fred-psel-close" onClick={onClose} aria-label="Close patient selection">✕</button>
        </div>

        <div className="fred-psel-search-row">
          <label htmlFor="patient-selection-search">Surname:</label>
          <input
            id="patient-selection-search"
            ref={inputRef}
            className="fred-psel-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Type surname to search..."
            autoComplete="off"
          />
          {loading && (
            <span style={{ fontSize: "10px", color: "#888" }}>Searching…</span>
          )}
        </div>

        <div className="fred-psel-col-headers">
          <span> </span>
          <span>Surname</span>
          <span>Firstname</span>
          <span>Address</span>
          <span>Medicare No.</span>
          <span>Conc.</span>
        </div>

        <div className="fred-psel-body">
          {/* Add New Patient — always first */}
          <div
            className={`fred-psel-row fred-psel-add-row${selectedIndex === 0 ? " selected" : ""}`}
            onClick={() => onAddNew(query)}
            onMouseEnter={() => setSelectedIndex(0)}
          >
            <span />
            <span style={{ gridColumn: "2 / -1" }}>&lt; Add New Patient &gt;</span>
          </div>

          {fetchError && (
            <div style={{ padding: "8px 6px", color: "#cc0000", fontSize: "11px" }}>
              Search failed — {fetchError}
              <button
                style={{ marginLeft: "8px", fontSize: "10px", cursor: "pointer" }}
                onClick={() => search(query)}
              >
                Retry
              </button>
            </div>
          )}

          {!fetchError && query.trim() && !loading && patients.length === 0 && (
            <div className="fred-psel-empty">
              No patients found for &ldquo;{query}&rdquo;
            </div>
          )}

          {patients.map((p, i) => {
            const rowIdx = i + 1;
            const isConc = !!p.concession_type;
            const addrStr = [p.address, p.suburb].filter(Boolean).join(", ");
            return (
              <div
                key={p.id}
                className={`fred-psel-row${selectedIndex === rowIdx ? " selected" : ""}`}
                onClick={() => onSelect(p)}
                onMouseEnter={() => setSelectedIndex(rowIdx)}
              >
                <span className="fred-psel-letter">{isConc ? "#" : ""}</span>
                <span>{p.surname}</span>
                <span>{p.firstname}</span>
                <span>{addrStr}</span>
                <span>{p.medicare_card ?? "—"}</span>
                <span>{p.concession_type ?? ""}</span>
              </div>
            );
          })}
        </div>

        <div className="fred-psel-footer">
          ↑↓ Navigate &nbsp;·&nbsp; Enter Select &nbsp;·&nbsp; Esc Close
        </div>
      </div>
    </div>
  );
}
