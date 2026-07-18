"use client";

import { useEffect, useRef } from "react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Read the prescription",
    detail:
      "Open the PRESCRIPTION tab on the right edge and read the paper script carefully. Every detail you enter is checked against it — and the details change on every attempt, so always transcribe rather than recall.",
  },
  {
    title: "Find the patient",
    detail:
      "Search by surname and confirm the details match the script (name, date of birth, Medicare). Some cases need a new patient entered from scratch.",
  },
  {
    title: "Select the prescriber and each medicine",
    detail:
      "Pick the prescriber from the directory, then search the drug directory for the exact product — brand versus generic matters. Scripts with two medicines have an item switcher; complete every item.",
  },
  {
    title: "Directions, quantity, repeats and labels",
    detail:
      "Transcribe the directions (abbreviations like tds are accepted), quantity and repeats for each item, then add the applicable warning labels. The label preview shows what the patient would receive.",
  },
  {
    title: "Make the clinical decision and dispense",
    detail:
      "Decide: dispense, hold and contact the prescriber, or do not supply. Some scripts contain a deliberate problem. Enter your initials and submit — an unsafe decision fails the attempt no matter how accurate the transcription.",
  },
  {
    title: "Counsel the patient",
    detail:
      "After submitting you hand over to the patient. Gather information, give safe instructions, use teach-back and invite questions — by text or voice. Dispensing and counselling combine into your final result.",
  },
];

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fred-onboarding-backdrop">
      <div
        className="fred-onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="fred-onboarding-title">
          <span id="onboarding-title">How a case works</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the walkthrough"
          >
            ✕
          </button>
        </div>

        <div className="fred-onboarding-body">
          <p className="fred-onboarding-intro">
            Each case is a complete dispensing episode: check the script, enter
            it accurately, make a safety decision, then counsel the patient.
          </p>

          <ol className="fred-onboarding-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="fred-onboarding-step-number">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="fred-onboarding-modes">
            <strong>Modes:</strong> Learn allows answer reveals, Practice is
            exam-like with optional reveals, and Exam hides all help and adds a
            timer. Reopen this guide any time from “How it works” in the toolbar.
          </p>
        </div>

        <div className="fred-onboarding-footer">
          <button ref={closeRef} type="button" onClick={onClose}>
            Start practising
          </button>
        </div>
      </div>
    </div>
  );
}
