"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { mergeWithLocal, searchLocalDrugs } from "@/lib/directory/local-fallback";
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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInternalQuery(query);
      setDrugs([]);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const safe = internalQuery.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    const bundled = searchLocalDrugs(safe);
    // Show the bundled directory immediately; delayed or failed requests cannot
    // hide case records or replace results for a newer query.
    setDrugs(bundled);
    setSelectedIndex(-1);
    if (!safe) { setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await createClient().from("drugs").select("*")
          .or(`generic_name.ilike.${safe}%,brand_name.ilike.${safe}%,full_display_name.ilike.%${safe}%`)
          .order("generic_name").order("is_generic").order("brand_name").limit(25).abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (!error) {
          setDrugs(mergeWithLocal((data as DrugRow[]) ?? [], bundled, 25));
          setSelectedIndex(-1);
        }
      } catch {
        // Keep the bundled results available when the network is unavailable.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, internalQuery]);

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
  }

  function confirmSelection() {
    const drug = drugs[selectedIndex];
    if (drug) onDrugSelected(drug);
  }

  if (!open) return null;

  return (
    <div
      className="fred-dsel-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      tabIndex={-1}
    >
      <div
        className="fred-dsel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drug-selection-title"
        data-tour="drug-dialog"
      >
        <div className="fred-dsel-title">
          <span id="drug-selection-title">Drug Selection</span>
          <button className="fred-dsel-close" onClick={onClose} aria-label="Close drug selection">✕</button>
        </div>

        <div className="fred-dsel-search-row">
          <label htmlFor="drug-selection-search">Brand / generic:</label>
          <input
            id="drug-selection-search"
            ref={inputRef}
            className="fred-dsel-search-input"
            value={internalQuery}
            onChange={(e) => setInternalQuery(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="Type a brand or active ingredient..."
            autoComplete="off"
          />
          {loading && <span className="fred-dsel-loading">Loading…</span>}
        </div>

        <div className="fred-dsel-col-headers">
          <span></span>
          <span>Brand / product</span>
          <span>Active ingredient</span>
          <span>Kind</span>
          <span className="right">Qty</span>
          <span className="right">Rp</span>
          <span>Type</span>
          <span>S</span>
          <span>Code</span>
          <span className="right">WSCost</span>
          <span className="right">Mf</span>
        </div>

        <div className="fred-dsel-body" role="listbox" aria-label="Matching medicine products">


          {!loading && internalQuery.trim() && drugs.length === 0 && (
            <div className="fred-dsel-empty">
              No matches for &ldquo;{internalQuery}&rdquo; — try a different name or spelling
            </div>
          )}

          {drugs.map((drug, i) => {
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
                role="option"
                aria-selected={selectedIndex === i}
                onClick={() => setSelectedIndex(i)}
                onDoubleClick={() => onDrugSelected(drug)}
              >
                <span className="fred-dsel-letter">{letter}</span>
                <span className="fred-dsel-name">
                  <strong>{drug.brand_name ?? "GENERIC"}</strong>
                  <small>{drug.form} {drug.strength}</small>
                </span>
                <span className="fred-dsel-generic-name">{drug.generic_name}</span>
                <span className={`fred-dsel-kind ${drug.is_generic ? "generic" : "brand"}`}>
                  {drug.is_generic ? "GENERIC" : "BRAND"}
                </span>
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
          <span>Brand is shown first. GENERIC is explicitly labelled · Click or use ↑↓ · Enter confirms</span>
          <button
            type="button"
            className="fred-dsel-confirm"
            onClick={confirmSelection}
            disabled={selectedIndex < 0 || !drugs[selectedIndex]}
          >
            Confirm selected product
          </button>
        </div>
      </div>
    </div>
  );
}
