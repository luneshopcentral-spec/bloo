"use client";

import { useEffect, useRef } from "react";
import type { DispenseResult } from "@/lib/scoring/types";

interface ResultOverlayProps {
  show: boolean;
  result: DispenseResult | null;
  sessionScore: { correct: number; total: number };
  onClose: () => void;
  onNext: () => void;
}

export function ResultOverlay({
  show,
  result,
  sessionScore,
  onClose,
  onNext,
}: ResultOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!show) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [show, onClose]);

  if (!show || !result) return null;

  return (
    <div className="fred-result-overlay show">
      <div
        ref={dialogRef}
        className="fred-result-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispense-results-title"
      >
        {/* Title bar */}
        <div className="fred-result-title">
          <span id="dispense-results-title">Dispensing Check Results</span>
          <button
            ref={closeRef}
            type="button"
            className="fred-result-close"
            onClick={onClose}
            aria-label="Close dispensing results"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="fred-result-body">
          <div
            className={`fred-result-summary ${result.passed ? "passed" : "failed"}`}
            aria-live="polite"
          >
            <div className="fred-result-score">
              {result.pointsEarned}/{result.pointsTotal}
            </div>
            <div>
              <div className="fred-result-outcome">
                {result.passed ? "Passed ✓" : "Needs review ✗"}
              </div>
              <div className="fred-result-session">
                Independent session: {sessionScore.correct}/{sessionScore.total}
              </div>
            </div>
          </div>

          {result.assisted && (
            <div className="fred-result-assisted" role="status">
              Assisted practice: answers were revealed, so this result is not included in progress.
            </div>
          )}

          {result.criticalFailures.length > 0 && (
            <div className="fred-result-critical" role="alert">
              <strong>Critical safety gate failed.</strong> A high point score cannot compensate for an unsafe patient, medicine, directions, quantity, repeats or clinical decision.
            </div>
          )}

          {/* Per-check rows */}
          {result.checks.map((check) => {
            const isAmber = check.isWarning;
            const bg = isAmber ? "#fff3cc" : check.passed ? "#ccffcc" : "#ffcccc";
            const border = isAmber
              ? "#cc8800"
              : check.passed
              ? "#00aa00"
              : "#cc0000";
            const icon = isAmber ? "⚠️" : check.passed ? "✅" : "❌";

            return (
              <div
                key={check.category}
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: "2px",
                  padding: "6px 8px",
                  marginBottom: "4px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "14px", flexShrink: 0, lineHeight: 1.4 }}>
                  {icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: "bold", fontSize: "12px" }}>
                    {check.label}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#444",
                      marginTop: "2px",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {check.detail}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pharmacist tip */}
          <div
            style={{
              background: "#e8f4ff",
              border: "1px solid #aaccff",
              borderRadius: "2px",
              padding: "8px",
              marginTop: "8px",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            <strong>💡 Pharmacist tip:</strong> {result.tip}
          </div>

        </div>

        {/* Footer */}
        <div className="fred-result-footer">
          <button className="fred-result-btn" onClick={onClose}>
            OK
          </button>
          <button
            className="fred-result-btn"
            onClick={() => {
              onNext();
              onClose();
            }}
          >
            Next Case →
          </button>
        </div>
      </div>
    </div>
  );
}
