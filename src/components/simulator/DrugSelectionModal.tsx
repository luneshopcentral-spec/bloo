"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DrugRow } from "@/lib/types/drug";

interface Props {
  open: boolean;
  query: string;              // initial query — student can refine inside the modal
  onDrugSelected: (drug: DrugRow) => void;
  onClose: () => void;
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export function DrugSelectionModal({ open, query, onDrugSelected, onClose }: Props) {
  const [internalQuery, setInternalQuery] = useState(query);
  const [drugs, setDrugs]         = useState<DrugRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef   = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open) {
      setInternalQuery(query);
      setDrugs([]);
      setFetchError("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, query]);

  async function search(q: string) {
    const safe = q.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    if (!safe) {
      setDrugs([]);
      setLoading(false);
      setFetchError("");
      return;
    }
    setLoading(true);
    setFetchError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("drugs")
      .select("*")
      .or(`generic_name.ilike.${safe}%,full_display_name.ilike.%${safe}%`)
      .order("generic_name")
      .order("is_generic")
      .order("brand_name")
      .limit(25);
    setLoading(false);
    if (error) {
      setFetchError(error.message);
      return;
    }
    setDrugs((data as DrugRow[]) ?? []);
    setSelectedIndex(0);
  }

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(internalQuery), 200);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalQuery]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, drugs.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const drug = drugs[selectedIndex];
      if (drug) onDrugSelected(drug);
      return;
    }
    // Letter shortcut: a-z jump to that row
    if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && e.target === inputRef.current) {
      // only trigger if input is empty (otherwise it's normal typing)
      return;
    }
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") { onClose(); return; }
    const letter = e.key.toLowerCase();
    const idx = LETTERS.indexOf(letter);
    if (idx !== -1 && idx < drugs.length) {
      setSelectedIndex(idx);
      const drug = drugs[idx];
      if (drug) onDrugSelected(drug);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fred-dsel-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleBodyKeyDown}
      tabIndex={-1}
    >
      <div
        className="fred-dsel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drug-selection-title"
      >
        <div className="fred-dsel-title">
          <span id="drug-selection-title">Drug Selection</span>
          <button className="fred-dsel-close" onClick={onClose} aria-label="Close drug selection">✕</button>
        </div>

        <div className="fred-dsel-search-row">
          <label htmlFor="drug-selection-search">Drug&nbsp;Name:</label>
          <input
            id="drug-selection-search"
            ref={inputRef}
            className="fred-dsel-search-input"
            value={internalQuery}
            onChange={(e) => setInternalQuery(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Type drug name to search..."
            autoComplete="off"
          />
          {loading && <span className="fred-dsel-loading">Loading…</span>}
        </div>

        <div className="fred-dsel-col-headers">
          <span></span>
          <span>Drug Name</span>
          <span className="right">Qty</span>
          <span className="right">Rp</span>
          <span>Type</span>
          <span>S</span>
          <span>Code</span>
          <span className="right">WSCost</span>
          <span className="right">Mf</span>
        </div>

        <div className="fred-dsel-body">
          {fetchError && (
            <div className="fred-dsel-error">
              Search failed — {fetchError}
              <button className="fred-dsel-retry" onClick={() => search(internalQuery)}>Retry</button>
            </div>
          )}

          {!fetchError && !loading && internalQuery.trim() && drugs.length === 0 && (
            <div className="fred-dsel-empty">
              No matches for &ldquo;{internalQuery}&rdquo; — try a different name or spelling
            </div>
          )}

          {!loading && !fetchError && drugs.map((drug, i) => {
            const letter = LETTERS[i] ?? "";
            const isPrivate = drug.supply_type === "Private";
            const schedLetter = drug.schedule?.replace(/^S/, "").toLowerCase() ?? "";
            return (
              <div
                key={drug.id}
                className={[
                  "fred-dsel-row",
                  selectedIndex === i ? "selected" : "",
                  isPrivate ? "private" : "",
                  drug.is_generic ? "generic" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => onDrugSelected(drug)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="fred-dsel-letter">{letter}</span>
                <span className="fred-dsel-name">{drug.full_display_name}</span>
                <span className="right">{drug.qty_default}</span>
                <span className="right">{drug.repeats_default}</span>
                <span>{drug.supply_type}</span>
                <span>{schedLetter}</span>
                <span>{drug.pbs_code ?? ""}</span>
                <span className="right">{drug.ws_cost != null ? drug.ws_cost.toFixed(2) : "—"}</span>
                <span className="right">{drug.manufacturer_code ?? ""}</span>
              </div>
            );
          })}
        </div>

        <div className="fred-dsel-footer">
          ↑↓ Navigate &nbsp;·&nbsp; a–z Jump &nbsp;·&nbsp; Enter Select &nbsp;·&nbsp; Esc Close
        </div>
      </div>
    </div>
  );
}
