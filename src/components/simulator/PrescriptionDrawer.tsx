"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PracticeCase } from "@/lib/types/case";
import { PrescriptionForm } from "./PrescriptionForm";
import "./prescription.css";
import "./prescriptionDrawer.css";

interface PrescriptionDrawerProps {
  caseData: PracticeCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overlayOpen: boolean;
}

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 2.0;
const ZOOM_STEP = 0.1;

function clampZoom(z: number): number {
  return parseFloat(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)).toFixed(1));
}

export function PrescriptionDrawer({
  caseData,
  open,
  onOpenChange,
  overlayOpen,
}: PrescriptionDrawerProps) {
  const [zoom, setZoom] = useState(1);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const closeRef    = useRef<HTMLButtonElement>(null);
  const prevOpenRef = useRef(false);

  // Focus management: open → focus close button; close → return to trigger
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
      prevOpenRef.current = true;
    } else if (prevOpenRef.current) {
      triggerRef.current?.focus();
      prevOpenRef.current = false;
    }
  }, [open]);

  // Keyboard shortcuts — only active when drawer open AND result overlay closed
  // (result overlay's own Esc handler takes priority when both are open)
  useEffect(() => {
    if (!open || overlayOpen) return;

    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          onOpenChange(false);
          break;
        case "+":
        case "=":
          setZoom(z => clampZoom(z + ZOOM_STEP));
          break;
        case "-":
          setZoom(z => clampZoom(z - ZOOM_STEP));
          break;
        case "0":
          setZoom(1);
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, overlayOpen, onOpenChange]);

  function adjustZoom(delta: number) {
    setZoom(z => clampZoom(z + delta));
  }

  return (
    <div
      className="presc-system"
      data-open={open ? "true" : "false"}
    >
      {/* ── Trigger tab ────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        className="presc-trigger"
        onClick={() => onOpenChange(!open)}
        aria-label={open ? "Close prescription view" : "Open prescription view"}
        aria-expanded={open}
        aria-controls="presc-dialog"
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        <span className="presc-trigger-label">PRESCRIPTION</span>
      </button>

      {/* ── Drawer panel ───────────────────────────────────────── */}
      <div
        id="presc-dialog"
        role="dialog"
        aria-label="Original prescription"
        aria-hidden={!open}
        className="presc-panel"
      >
        {/* Header bar */}
        <div className="presc-header">
          <span className="presc-title">Prescription</span>

          <div className="presc-zoom-controls">
            <button
              className="presc-zoom-btn"
              onClick={() => adjustZoom(-ZOOM_STEP)}
              aria-label="Zoom out"
            >
              <span className="presc-zoom-icon">−</span>
            </button>

            <span className="presc-zoom-pct">{Math.round(zoom * 100)}%</span>

            <button
              className="presc-zoom-btn"
              onClick={() => adjustZoom(ZOOM_STEP)}
              aria-label="Zoom in"
            >
              <span className="presc-zoom-icon">+</span>
            </button>

            <button
              className="presc-zoom-btn presc-zoom-reset"
              onClick={() => setZoom(1)}
              aria-label="Reset zoom"
            >
              Reset
            </button>
          </div>

          <button
            ref={closeRef}
            className="presc-close-btn"
            onClick={() => onOpenChange(false)}
            aria-label="Close prescription drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content — CSS zoom expands layout dimensions naturally */}
        <div className="presc-scroll">
          <div style={{ zoom: zoom as number }}>
            <PrescriptionForm caseData={caseData} />
          </div>
        </div>
      </div>
    </div>
  );
}
