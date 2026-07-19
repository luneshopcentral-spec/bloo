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
  const icon = warning ? "⚠️" : passed ? "✅" : "❌";

  return (
    <div className={`fred-result-row${warning ? " warning" : passed ? " passed" : " failed"}`}>
      <span className="fred-result-row-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
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
  const dispensingNeedsAttention = result.dispense.checks.filter((check) => !check.passed || check.isWarning);
  const counsellingNeedsAttention = result.counselling.checks.filter((check) => !check.passed);
  const needsAttentionCount = dispensingNeedsAttention.length + counsellingNeedsAttention.length;
  const completedCount = result.dispense.checks.filter((check) => check.passed && !check.isWarning).length
    + result.counselling.checks.filter((check) => check.passed).length;

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

          <div className="fred-result-priority-grid">
            <section className={needsAttentionCount > 0 ? "needs-attention" : "all-clear"}>
              <span>{needsAttentionCount > 0 ? "Needs attention" : "Safety checks"}</span>
              <strong>{needsAttentionCount > 0 ? needsAttentionCount : "Clear"}</strong>
              <p>
                {needsAttentionCount > 0
                  ? "Review these items before trying the case again."
                  : "No marked dispensing or communication gaps."}
              </p>
            </section>
            <section className="completed">
              <span>Demonstrated</span>
              <strong>{completedCount}</strong>
              <p>Workflow and consultation checks completed successfully.</p>
            </section>
          </div>

          <details className="fred-result-details" open={!result.passed}>
            <summary>
              <span>Dispensing workflow · Entry and pack checks</span>
              <strong>{result.dispense.pointsEarned}/{result.dispense.pointsTotal}</strong>
            </summary>
            <div className="fred-result-details-body">
              {/* Index-keyed: multi-item prescriptions repeat check categories. */}
              {result.dispense.checks.map((check, index) => (
                <ResultRow
                  key={`dispense-${check.category}-${index}`}
                  label={check.label}
                  detail={check.detail}
                  passed={check.passed}
                  warning={check.isWarning}
                />
              ))}
            </div>
          </details>

          <details className="fred-result-details counselling" open={!result.passed}>
            <summary>
              <span>Patient interaction</span>
              <strong>{result.counselling.pointsEarned}/{result.counselling.pointsTotal}</strong>
            </summary>
            <div className="fred-result-details-body">
              {result.counselling.checks.map((check) => (
                <ResultRow
                  key={`counselling-${check.id}`}
                  label={check.label}
                  detail={check.detail}
                  passed={check.passed}
                />
              ))}
            </div>
          </details>

          <div className="fred-result-method-note">
            <strong>Conversation assessment:</strong>{" "}
            {result.counselling.matcherMode === "semantic"
              ? "Local semantic matching plus deterministic clinical safety rules."
              : "Expanded local language matching plus deterministic clinical safety rules."}
            {` ${result.counselling.turns} student turn${result.counselling.turns === 1 ? "" : "s"} assessed.`}
          </div>

          <div className="fred-result-tip">
            <strong>💡 Pharmacist tip:</strong> {result.dispense.tip}
          </div>
        </div>

        <div className="fred-result-footer">
          <button className="fred-result-btn" onClick={onClose}>Review transcript</button>
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
