"use client";

import { useState } from "react";
import type { WarningLabel } from "@/lib/types/case";
import { MedicinesReferenceDesk } from "@/components/simulator/MedicinesReferenceDesk";
import { resolveWarningLabelInput } from "@/lib/warnings/resolve";

interface WarningsBoxProps {
  warnings: WarningLabel[];
  selectedWarnings: Set<string>;
  onToggle: (warningText: string) => void;
  medicineName: string;
}

export function WarningsBox({
  warnings,
  selectedWarnings,
  onToggle,
  medicineName,
}: WarningsBoxProps) {
  const [draft, setDraft] = useState("");
  const [entryMessage, setEntryMessage] = useState("");
  const selectedLabels = Array.from(selectedWarnings).map((text) =>
    warnings.find((warning) => warning.text === text) ?? { lbl: "?", sig: "CUSTOM", text }
  );

  function addWrittenLabel() {
    const match = resolveWarningLabelInput(warnings, draft);
    if (!match) {
      setEntryMessage("Label not recognised. Use the standard wording or a training label code.");
      return;
    }
    if (selectedWarnings.has(match.text)) {
      setEntryMessage("That label is already on the dispensing label.");
      return;
    }
    onToggle(match.text);
    setDraft("");
    setEntryMessage(`${match.text} added`);
  }

  return (
    <fieldset className="fred-warn-box">
      <legend className="fred-warn-title">
        Warnings — <span className="fred-warn-title-red">F2T</span>
      </legend>
      <div className="fred-warn-subtitle">
        <span>Write applicable labels:</span>
        <MedicinesReferenceDesk medicineName={medicineName} />
      </div>

      <form
        className="fred-warn-entry"
        onSubmit={(event) => {
          event.preventDefault();
          addWrittenLabel();
        }}
      >
        <label htmlFor="warning-label-entry">Warning label or code</label>
        <div>
          <input
            id="warning-label-entry"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setEntryMessage("");
            }}
            placeholder="e.g. Shake well before use"
            autoComplete="off"
          />
          <button type="submit" disabled={!draft.trim()}>Add</button>
        </div>
        <p>The available-label list is hidden during the attempt. Common equivalent wording is accepted.</p>
        {entryMessage && <span className="fred-warn-entry-message" role="status">{entryMessage}</span>}
      </form>

      <div className="fred-warn-selected" aria-label="Labels added to the dispensing label">
        {selectedLabels.length === 0 ? (
          <p>No warning labels added.</p>
        ) : (
          selectedLabels.map((warning) => (
            <div key={warning.text} className="fred-warn-selected-row">
              <span className="fred-warn-lbl">{warning.lbl}</span>
              <span className="fred-warn-sig">{warning.sig}</span>
              <span>{warning.text}</span>
              <button type="button" onClick={() => onToggle(warning.text)} aria-label={`Remove ${warning.text}`}>×</button>
            </div>
          ))
        )}
      </div>
    </fieldset>
  );
}
