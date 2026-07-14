"use client";

import { useState } from "react";
import type { WarningLabel } from "@/lib/types/case";
import { MedicinesReferenceDesk } from "@/components/simulator/MedicinesReferenceDesk";

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
  const [selectedOption, setSelectedOption] = useState("");
  const [entryMessage, setEntryMessage] = useState("");
  const selectedLabels = Array.from(selectedWarnings).map((text) =>
    warnings.find((warning) => warning.text === text) ?? { lbl: "?", sig: "CUSTOM", text }
  );

  function addSelectedLabel() {
    const match = warnings.find((warning) => warning.text === selectedOption);
    if (!match) {
      setEntryMessage("Choose a warning label first.");
      return;
    }
    if (selectedWarnings.has(match.text)) {
      setEntryMessage("That label is already on the dispensing label.");
      return;
    }
    onToggle(match.text);
    setSelectedOption("");
    setEntryMessage(`${match.text} added`);
  }

  return (
    <fieldset className="fred-warn-box">
      <legend className="fred-warn-title">
        Warnings — <span className="fred-warn-title-red">F2T</span>
      </legend>
      <div className="fred-warn-subtitle">
        <span>Select applicable labels:</span>
        <MedicinesReferenceDesk medicineName={medicineName} />
      </div>

      <form
        className="fred-warn-entry"
        onSubmit={(event) => {
          event.preventDefault();
          addSelectedLabel();
        }}
      >
        <label htmlFor="warning-label-entry">Available warning labels</label>
        <div>
          <select
            id="warning-label-entry"
            value={selectedOption}
            onChange={(event) => {
              setSelectedOption(event.target.value);
              setEntryMessage("");
            }}
          >
            <option value="">— Select a label —</option>
            {warnings.map((warning) => (
              <option key={warning.text} value={warning.text} disabled={selectedWarnings.has(warning.text)}>
                {warning.lbl} · {warning.sig} · {warning.text}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!selectedOption}>Add</button>
        </div>
        <p>Use the medicines reference to decide which standard labels apply, then choose them here.</p>
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
