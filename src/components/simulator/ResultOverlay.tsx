"use client";

import { useEffect, useRef } from "react";
import type { AttemptResult } from "@/lib/conversation/types";

interface ResultOverlayProps {
  show: boolean;
  result: AttemptResult | null;
  sessionScore: { correct: number; total: number };
  onClose: () => void;
  onNext: () => void;
}
interface ResultRowProps {
  label: string;
  detail: string;
  passed: boolean;
  warning?: boolean;
}

function ResultRow({ label, detail, passed, warning }: ResultRowProps) {
  const background = warning ? "#fff3cc" : passed ? "#ccffcc" : "#ffcccc";
  const border = warning ? "#cc8800" : passed ? "#00aa00" : "#cc0000";
  const icon = warning ? "⚠️" : passed ? "✅" : "❌";

  return (
    <div
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: "2px",
        padding: "6px 8px",
        marginBottom: "4px",
        display: "flex",
        gap: "8px",
        alignItems: "flex-start",
      }}
    >
      <span style={{ fontSize: "14px", flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: "bold", fontSize: "12px" }}>{label}</div>
        <div
          style={{
            fontSize: "11px",
            color: "#444",
            marginTop: "2px",
            whiteSpace: "pre-line",
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
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

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
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

  const dispensingCritical = result.dispense.criticalFailures.length;
  const counsellingCritical = result.counselling.criticalFailures.length;
  const totalEarned = result.dispense.pointsEarned + result.counselling.pointsEarned;
  const totalAvailable = result.dispense.pointsTotal + result.counselling.pointsTotal;

  return (
    <div className="fred-result-overlay show">
      <div
        ref={dialogRef}
        className="fred-result-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attempt-results-title"
      >
        <div className="fred-result-title">
          <span id="attempt-results-title">Complete Attempt Results</span>
          <button
            ref={closeRef}
            type="button"
            className="fred-result-close"
            onClick={onClose}
            aria-label="Close complete attempt results"
          >
            ✕
          </button>
        </div>

        <div className="fred-result-body">
          <div
            className={`fred-result-summary ${result.passed ? "passed" : "failed"}`}
            aria-live="polite"
          >
            <div className="fred-result-score">{totalEarned}/{totalAvailable}</div>
            <div>
              <div className="fred-result-outcome">
                {result.passed ? "Complete attempt passed ✓" : "Complete attempt needs review ✕"}
              </div>
              <div className="fred-result-session">
                Independent session: {sessionScore.correct}/{sessionScore.total}
              </div>
            </div>
          </div>

          {result.assisted && (
            <div className="fred-result-assisted" role="status">
              Assisted practice: dispensing answers were revealed, so this complete attempt is not included in progress.
            </div>
          )}

          {(dispensingCritical > 0 || counsellingCritical > 0) && (
            <div className="fred-result-critical" role="alert">
              <strong>Critical safety gate failed.</strong> A high total score cannot compensate for an unsafe dispensing decision or missing safety-critical patient communication.
            </div>
          )}

          <div className="fred-result-section-heading">
            <span>Stage 1 · Dispensing</span>
            <strong>{result.dispense.pointsEarned}/{result.dispense.pointsTotal}</strong>
          </div>
          {result.dispense.checks.map((check) => (
            <ResultRow
              key={`dispense-${check.category}`}
              label={check.label}
              detail={check.detail}
              passed={check.passed}
              warning={check.isWarning}
            />
          ))}

          <div className="fred-result-section-heading counselling">
            <span>Stage 2 · Patient interaction</span>
            <strong>{result.counselling.pointsEarned}/{result.counselling.pointsTotal}</strong>
          </div>
          {result.counselling.checks.map((check) => (
            <ResultRow
              key={`counselling-${check.id}`}
              label={check.label}
              detail={check.detail}
              passed={check.passed}
            />
          ))}

          <div className="fred-result-method-note">
            <strong>Conversation assessment:</strong>{" "}
            {result.counselling.matcherMode === "semantic"
              ? "Local semantic matching plus deterministic clinical safety rules."
              : "Basic local phrase matching plus deterministic clinical safety rules."}
            {` ${result.counselling.turns} student turn${result.counselling.turns === 1 ? "" : "s"} assessed.`}
          </div>

          <div className="fred-result-tip">
            <strong>💡 Pharmacist tip:</strong> {result.dispense.tip}
          </div>
        </div>

        <div className="fred-result-footer">
          <button className="fred-result-btn" onClick={onClose}>Review conversation</button>
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
