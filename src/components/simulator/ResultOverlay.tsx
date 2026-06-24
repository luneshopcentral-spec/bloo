"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  if (!show || !result) return null;

  return (
    <div className="fred-result-overlay show">
      <div className="fred-result-box">
        {/* Title bar */}
        <div className="fred-result-title">
          <span>Dispensing Check Results</span>
          <span className="fred-result-close" onClick={onClose}>
            ✕
          </span>
        </div>

        {/* Body */}
        <div className="fred-result-body">
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

          {/* Score block */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "10px",
              padding: "8px 10px",
              background: result.passed ? "#ccffcc" : "#ffcccc",
              border: `1px solid ${result.passed ? "#00aa00" : "#cc0000"}`,
              borderRadius: "2px",
            }}
          >
            <div
              style={{
                fontSize: "26px",
                fontWeight: "bold",
                color: result.passed ? "#006600" : "#cc0000",
                lineHeight: 1,
              }}
            >
              {result.pointsEarned}/{result.pointsTotal}
            </div>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "12px" }}>
                {result.passed ? "Passed ✓" : "Needs Review ✗"}
              </div>
              <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>
                Session: {sessionScore.correct}/{sessionScore.total}
              </div>
            </div>
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
