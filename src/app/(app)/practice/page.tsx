"use client";

import { useState, useReducer, useEffect } from "react";
import "./simulator.css";

import { STATIC_CASES, ALL_WARNINGS } from "@/lib/cases/static-cases";
import {
  formReducer,
  EMPTY_FORM_STATE,
} from "@/components/simulator/state";
import { validateDispense } from "@/lib/scoring/validate";
import type { DispenseResult } from "@/lib/scoring/types";
import type { MessageRow } from "@/lib/types/case";

import { TitleBar }       from "@/components/simulator/TitleBar";
import { MenuBar }        from "@/components/simulator/MenuBar";
import { Toolbar }        from "@/components/simulator/Toolbar";
import { CasePanel }      from "@/components/simulator/CasePanel";
import { PatientHeader }  from "@/components/simulator/PatientHeader";
import { ScriptForm }     from "@/components/simulator/ScriptForm";
import { DrugDetailsBox } from "@/components/simulator/DrugDetailsBox";
import { WarningsBox }    from "@/components/simulator/WarningsBox";
import { LabelPreview }   from "@/components/simulator/LabelPreview";
import { ApiBox }         from "@/components/simulator/ApiBox";
import { ActionButtons }  from "@/components/simulator/ActionButtons";
import { MessagesPanel }  from "@/components/simulator/MessagesPanel";
import { StatusBar }      from "@/components/simulator/StatusBar";
import { HistoryPanel }   from "@/components/simulator/HistoryPanel";
import { ResultOverlay }  from "@/components/simulator/ResultOverlay";

const DEFAULT_STATUS =
  "Enter drug details and complete the label, then enter initials to dispense.";

export default function PracticePage() {
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0);
  const [formState, dispatch] = useReducer(formReducer, EMPTY_FORM_STATE);
  const [selectedWarnings, setSelectedWarnings] = useState<Set<string>>(
    new Set()
  );
  const [statusMessage, setStatusMessage] = useState(DEFAULT_STATUS);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  // Phase 4 additions
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [lastResult, setLastResult] = useState<DispenseResult | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [initialsError, setInitialsError] = useState(false);

  const current = STATIC_CASES[currentCaseIndex];

  // ── Reset form whenever the case changes ───────────────────────────
  useEffect(() => {
    const c = STATIC_CASES[currentCaseIndex];

    dispatch({ type: "RESET" });
    // Pre-fill "given" info visible on the prescription
    dispatch({ type: "SET_FIELD", field: "scriptDate",   value: c.date });
    dispatch({ type: "SET_FIELD", field: "prescriberNo", value: c.prescriberNo });
    dispatch({ type: "SET_FIELD", field: "scriptType",   value: c.scriptType });

    setSelectedWarnings(new Set());
    setInitialsError(false);
    setStatusMessage(DEFAULT_STATUS);

    const msgs: MessageRow[] = c.errors.map((err, i) => ({
      id: `E${String(i + 1).padStart(3, "0")}`,
      patient: c.patient,
      item: c.drug,
      summary: err,
      severity: err.includes("⚠") ? "error" : ("warning" as const),
    }));
    setMessages(msgs);
  }, [currentCaseIndex]);

  // ── Status nudge when pharmacist initials reach ≥2 chars ──────────
  useEffect(() => {
    if (formState.pharmacistInitials.trim().length >= 2) {
      setStatusMessage("Pharmacist initials entered. Ready to dispense.");
    }
  }, [formState.pharmacistInitials]);

  // ── Handlers ───────────────────────────────────────────────────────
  function handleCaseChange(n: number) {
    setCurrentCaseIndex(n);
  }

  function handleNext() {
    setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length);
  }

  function handleNextFromOverlay() {
    setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length);
    // case-change useEffect resets form + status automatically
  }

  function handleClear() {
    // Session score intentionally NOT reset here — only page reload resets it
    dispatch({ type: "RESET" });
    setSelectedWarnings(new Set());
    setStatusMessage("Form cleared. Enter the next script.");
    setMessages([]);
  }

  function handleShowAnswers() {
    dispatch({ type: "FILL_FROM_CASE", case: current });
    setSelectedWarnings(new Set(current.correctWarnings));
    setStatusMessage(
      "Answers shown — study the label and warnings, then try the next case."
    );
  }

  function handleDispense() {
    // Block if pharmacist initials are missing or too short
    if (formState.pharmacistInitials.trim().length < 2) {
      setInitialsError(true);
      setStatusMessage("⚠ Pharmacist initials required before dispensing.");
      setTimeout(() => setInitialsError(false), 3000);
      return;
    }

    const result = validateDispense({
      formState,
      selectedWarnings,
      caseData: STATIC_CASES[currentCaseIndex],
    });

    setLastResult(result);
    setSessionScore((prev) => ({
      correct: prev.correct + (result.passed ? 1 : 0),
      total: prev.total + 1,
    }));
    setStatusMessage(
      result.passed
        ? `✓ Dispense check passed (${result.pointsEarned}/${result.pointsTotal}) — review the feedback before moving on.`
        : `✗ Dispense check needs review (${result.pointsEarned}/${result.pointsTotal}) — see the result panel.`
    );
    setOverlayOpen(true);
  }

  function handleToggleWarning(warningText: string) {
    setSelectedWarnings((prev) => {
      const next = new Set(prev);
      if (next.has(warningText)) {
        next.delete(warningText);
      } else {
        next.add(warningText);
      }
      return next;
    });
  }

  return (
    <div className="fred-root">
      {/* Narrow-screen notice */}
      <div className="fred-narrow-banner">
        DispenseRx Practice is designed for laptops and desktops. For the best
        experience, switch to a larger screen.
      </div>

      <TitleBar />
      <MenuBar />
      <Toolbar
        currentCase={currentCaseIndex}
        onCaseChange={handleCaseChange}
        cases={STATIC_CASES}
        sessionScore={sessionScore}
      />

      {/* Two-column layout: main content | history panel */}
      <div className="grid grid-cols-[1fr_220px] items-start">
        {/* ── LEFT: main content ── */}
        <div>
          <div className="fred-main-win">
            <CasePanel caseData={current} />

            <PatientHeader
              caseData={current}
              onStatusUpdate={setStatusMessage}
            />

            {/* Script form + drug details */}
            <div className="grid grid-cols-[1fr_220px] gap-1 mb-1">
              <ScriptForm
                formState={formState}
                dispatch={dispatch}
                initialsError={initialsError}
              />
              <DrugDetailsBox
                typedDrug={formState.drug}
                caseData={current}
              />
            </div>

            {/* Warnings + label + API */}
            <div className="grid grid-cols-[160px_1fr_100px] gap-1 mb-1">
              <WarningsBox
                warnings={ALL_WARNINGS}
                selectedWarnings={selectedWarnings}
                onToggle={handleToggleWarning}
              />
              <LabelPreview
                caseData={current}
                formState={formState}
                selectedWarnings={selectedWarnings}
              />
              <ApiBox />
            </div>

            <ActionButtons
              onDispense={handleDispense}
              onShowAnswers={handleShowAnswers}
              onClear={handleClear}
              onNext={handleNext}
            />

            <MessagesPanel messages={messages} />

            <StatusBar message={statusMessage} />
          </div>
        </div>

        {/* ── RIGHT: sticky history panel ── */}
        <HistoryPanel
          caseData={current}
          onStatusUpdate={setStatusMessage}
        />
      </div>

      <ResultOverlay
        show={overlayOpen}
        result={lastResult}
        sessionScore={sessionScore}
        onClose={() => setOverlayOpen(false)}
        onNext={handleNextFromOverlay}
      />
    </div>
  );
}
