"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PracticeCase } from "@/lib/types/case";
import {
  GUIDED_TUTORIAL_EXPLANATION_MESSAGE,
  GUIDED_TUTORIAL_OPENING_MESSAGE,
  GUIDED_TUTORIAL_SAFETY_MESSAGE,
} from "@/lib/practice/guided-tutorial";

export const GUIDED_TUTORIAL_STEPS = [
  "welcome",
  "prescription",
  "patient",
  "prescriber",
  "medicine",
  "label-entry",
  "initials",
  "decision",
  "dispense-submit",
  "pack",
  "main-label",
  "warning-labels",
  "assembly-submit",
  "patient-question",
  "patient-explanation",
  "patient-safety-close",
  "finish-consultation",
  "results",
] as const;

export type GuidedTutorialStep = (typeof GUIDED_TUTORIAL_STEPS)[number];

interface GuidedTutorialProps {
  active: boolean;
  step: GuidedTutorialStep;
  caseData: PracticeCase;
  onNext: () => void;
  onExit: () => void;
}

interface TutorialStepDefinition {
  eyebrow: string;
  title: string;
  body: string;
  instruction: string;
  targets?: string[];
  cardAnchorTargets?: string[];
  compactModal?: boolean;
  preferredSide?: "left" | "right";
  manualNext?: boolean;
  final?: boolean;
}

interface TargetRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function visibleTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const visible = elements.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== "none"
        && style.visibility !== "hidden";
    });
    if (visible) return visible;
  }
  return null;
}

function rectOf(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function definitions(caseData: PracticeCase): Record<GuidedTutorialStep, TutorialStepDefinition> {
  const item = caseData.items[0];
  const patient = caseData.patientLookup.prescriptionPatient;
  return {
    welcome: {
      eyebrow: "Guided tutorial",
      title: "Complete a real case with help",
      body:
        "This is the actual Case 1 workflow. The guide will point to one control at a time and wait for you to use it before moving on.",
      instruction:
        "You will practise dispensing, physical pack assembly and the patient interaction. This tutorial runs in Learn mode and does not affect your progress.",
      targets: ['[data-tour="guided-tutorial-button"]'],
      manualNext: true,
    },
    prescription: {
      eyebrow: "Stage 1 · Dispensing",
      title: "Open the printed prescription",
      body:
        "The prescription is the source of truth. It stays available while other directories and panels are open.",
      instruction: "Select the highlighted PRESCRIPTION tab to open it.",
      targets: ['[data-tour="prescription-trigger"]'],
    },
    patient: {
      eyebrow: "Stage 1 · Dispensing",
      title: "Find and confirm the patient",
      body:
        `Search for ${patient.name}. Match the address and Medicare details to the printed prescription before selecting a row.`,
      instruction: `Type SMITH, then select the ${patient.address} record.`,
      targets: ['#patient-selection-search', '[data-tour="patient-field"]'],
      cardAnchorTargets: ['[data-tour="patient-dialog"]'],
      compactModal: true,
    },
    prescriber: {
      eyebrow: "Stage 1 · Dispensing",
      title: "Use the prescriber directory",
      body:
        `Search for ${caseData.doctor}. The prescriber number must match the current printed prescription.`,
      instruction: "Open Directory, search the surname, select the matching prescriber, then confirm the number.",
      targets: ['#prescriber-search', '[data-tour="prescriber-field"]'],
      cardAnchorTargets: ['[data-tour="prescriber-dialog"]'],
      compactModal: true,
    },
    medicine: {
      eyebrow: "Stage 1 · Dispensing",
      title: "Select the exact product",
      body:
        "Medicine, strength, form, manufacturer and pack size all matter. Do not select a lookalike.",
      instruction: `Search ERYTHROMYCIN and select ${item.drug}.`,
      targets: ['#drug-selection-search', '[data-tour="medicine-field"]'],
      cardAnchorTargets: ['[data-tour="drug-dialog"]'],
      compactModal: true,
    },
    "label-entry": {
      eyebrow: "Stage 1 · Dispensing",
      title: "Transcribe the label details",
      body:
        "Enter what is printed on the prescription. The directions preview expands accepted abbreviations.",
      instruction:
        `Directions: “${item.directions}” · Repeats: ${item.repeats} · Quantity: ${item.qty} · Price: ${item.price2.replace("$", "")}`,
      targets: ['[data-tour="label-entry-fields"]'],
    },
    initials: {
      eyebrow: "Stage 1 · Dispensing",
      title: "Enter your pharmacist initials",
      body:
        "Initials record who completed the dispensing entry and unlock the final workflow check.",
      instruction: "Enter two or three of your own initials.",
      targets: ['[data-tour="pharmacist-initials"]'],
    },
    decision: {
      eyebrow: "Stage 1 · Clinical check",
      title: "Make the safe clinical decision",
      body:
        "The patient history shows this repeat is being requested before the previous antibiotic course should have finished.",
      instruction: "Select “Hold and contact prescriber”.",
      targets: ['[data-tour="clinical-decision"]'],
    },
    "dispense-submit": {
      eyebrow: "Stage 1 · Final check",
      title: "Continue to physical assembly",
      body:
        "The readiness panel should now show that every required entry is complete. Review the label once more before continuing.",
      instruction: "Select “Complete dispensing → Pack assembly”.",
      targets: ['[data-tour="dispense-submit"]'],
    },
    pack: {
      eyebrow: "Stage 2 · Workbench",
      title: "Choose the correct physical pack",
      body:
        "Compare every pack detail against the prescription. Similar names and strengths are deliberate distractors.",
      instruction: "Choose Mayne Pharma Erythromycin 250 mg capsules, pack of 25.",
      targets: ['[data-tour="pack-shelf"]'],
    },
    "main-label": {
      eyebrow: "Stage 2 · Workbench",
      title: "Place the dispensing label safely",
      body:
        "Turn the carton to the Back face. Select or drag the main label and place it in a clear area without covering printed information.",
      instruction: "Use the Back control, then place the dispensing label in the clear upper area.",
      targets: ['[data-tour="carton-bench"]', '[data-tour="main-label-tray"]'],
      preferredSide: "left",
    },
    "warning-labels": {
      eyebrow: "Stage 2 · Workbench",
      title: "Apply and rotate the warning labels",
      body:
        "Apply Complete the full course and May cause nausea. Labels must not overlap or cover carton information.",
      instruction:
        "Place the warnings on clear areas. Select one placed warning and use Turn 90° so you learn the rotation control.",
      targets: ['[data-tour="warning-label-tray"]', '[data-tour="carton-bench"]'],
      cardAnchorTargets: ['[data-tour="carton-bench"]'],
      preferredSide: "left",
    },
    "assembly-submit": {
      eyebrow: "Stage 2 · Final pack check",
      title: "Continue to the patient interaction",
      body:
        "You have selected the pack and physically applied the required labels. The final marking will also check their positions.",
      instruction: "Select “Continue to patient consultation”.",
      targets: ['[data-tour="assembly-submit"]'],
    },
    "patient-question": {
      eyebrow: "Stage 3 · Patient interaction",
      title: "Ask an opening safety question",
      body:
        "Use the conversation box exactly as you would speak at the counter. The simulated patient responds to the meaning of your message.",
      instruction:
        `Type: “${GUIDED_TUTORIAL_OPENING_MESSAGE}” Then send it.`,
      targets: ['[data-tour="counselling-composer"]'],
    },
    "patient-explanation": {
      eyebrow: "Stage 3 · Patient interaction",
      title: "Explain the medicine and plan",
      body:
        "Respond in clear patient-friendly language and stay consistent with the clinical decision you recorded.",
      instruction:
        `Type: “${GUIDED_TUTORIAL_EXPLANATION_MESSAGE}” Then send it.`,
      targets: ['[data-tour="counselling-composer"]'],
    },
    "patient-safety-close": {
      eyebrow: "Stage 3 · Patient interaction",
      title: "Safety-net, check understanding and close",
      body:
        "Finish the handover with practical side-effect advice, urgent warning signs, teach-back and an invitation for questions.",
      instruction:
        `Type: “${GUIDED_TUTORIAL_SAFETY_MESSAGE}” Then send it.`,
      targets: ['[data-tour="counselling-composer"]'],
    },
    "finish-consultation": {
      eyebrow: "Stage 3 · Patient interaction",
      title: "Finish and review feedback",
      body:
        "In a full attempt you can continue for as many turns as needed. The tutorial has now shown the interaction controls.",
      instruction: "Select “Finish consultation” to see the combined dispensing and communication feedback.",
      targets: ['[data-tour="counselling-finish"]'],
    },
    results: {
      eyebrow: "Tutorial complete",
      title: "You have completed the full workflow",
      body:
        "You opened and transcribed a prescription, made a clinical decision, assembled the physical pack, applied labels and interacted with the patient.",
      instruction:
        "This guided result is for learning only. Review the feedback, then try Case 1 independently from the case selector.",
      targets: ['[data-tour="result-dialog"]'],
      manualNext: true,
      final: true,
    },
  };
}

export function GuidedTutorial({
  active,
  step,
  caseData,
  onNext,
  onExit,
}: GuidedTutorialProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [anchorRect, setAnchorRect] = useState<TargetRect | null>(null);
  const [measuredCardHeight, setMeasuredCardHeight] = useState(0);
  const actionRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const stepDefinitions = useMemo(() => definitions(caseData), [caseData]);
  const definition = stepDefinitions[step];
  const stepNumber = GUIDED_TUTORIAL_STEPS.indexOf(step) + 1;

  useEffect(() => {
    if (!active) return;
    const selectors = definition.targets ?? [];

    function updateTarget() {
      const target = visibleTarget(selectors);
      const anchor = visibleTarget(definition.cardAnchorTargets ?? []);
      setTargetRect(target ? rectOf(target) : null);
      setAnchorRect(anchor ? rectOf(anchor) : null);
    }

    function revealTarget() {
      const target = visibleTarget(selectors);
      target?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      updateTarget();
    }

    updateTarget();
    const revealTimer = window.setTimeout(revealTarget, 80);
    const retryTimer = window.setTimeout(revealTarget, 420);
    const interval = window.setInterval(updateTarget, 160);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(retryTimer);
      window.clearInterval(interval);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [active, definition.cardAnchorTargets, definition.targets, step]);

  useEffect(() => {
    if (!active || !definition.manualNext) return;
    const timer = window.setTimeout(() => actionRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [active, definition.manualNext, step]);

  useEffect(() => {
    if (!active || !cardRef.current) return;
    const card = cardRef.current;
    const updateHeight = () => setMeasuredCardHeight(card.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    return () => observer.disconnect();
  }, [active, step]);

  if (!active) return null;

  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
  const compactModal = Boolean(definition.compactModal && anchorRect);
  const cardWidth = Math.min(compactModal ? 460 : 340, viewportWidth - 32);
  const estimatedCardHeight = measuredCardHeight || (compactModal ? 170 : 285);
  const gap = 18;
  let cardLeft = (viewportWidth - cardWidth) / 2;
  let cardTop = Math.max(16, (viewportHeight - estimatedCardHeight) / 2);
  let arrow = "none";

  const positionRect = anchorRect ?? targetRect;

  if (positionRect) {
    const canFitRight = positionRect.right + gap + cardWidth <= viewportWidth - 16;
    const canFitLeft = positionRect.left - gap - cardWidth >= 16;
    if (definition.preferredSide === "left" && canFitLeft) {
      cardLeft = positionRect.left - gap - cardWidth;
      cardTop = Math.min(
        Math.max(16, positionRect.top + positionRect.height / 2 - estimatedCardHeight / 2),
        viewportHeight - estimatedCardHeight - 16
      );
      arrow = "right";
    } else if (canFitRight) {
      cardLeft = positionRect.right + gap;
      cardTop = Math.min(
        Math.max(16, positionRect.top + positionRect.height / 2 - estimatedCardHeight / 2),
        viewportHeight - estimatedCardHeight - 16
      );
      arrow = "left";
    } else if (canFitLeft) {
      cardLeft = positionRect.left - gap - cardWidth;
      cardTop = Math.min(
        Math.max(16, positionRect.top + positionRect.height / 2 - estimatedCardHeight / 2),
        viewportHeight - estimatedCardHeight - 16
      );
      arrow = "right";
    } else if (positionRect.bottom + gap + estimatedCardHeight <= viewportHeight - 16) {
      cardLeft = Math.min(
        Math.max(16, positionRect.left + positionRect.width / 2 - cardWidth / 2),
        viewportWidth - cardWidth - 16
      );
      cardTop = positionRect.bottom + gap;
      arrow = "top";
    } else {
      cardLeft = Math.min(
        Math.max(16, positionRect.left + positionRect.width / 2 - cardWidth / 2),
        viewportWidth - cardWidth - 16
      );
      cardTop = Math.max(16, positionRect.top - gap - estimatedCardHeight);
      arrow = "bottom";
    }
  }

  let targetArrow: { glyph: string; left: number; top: number } | null = null;
  if (targetRect && arrow !== "none") {
    if (arrow === "right") {
      targetArrow = {
        glyph: "→",
        left: Math.max(4, targetRect.left - 34),
        top: Math.min(viewportHeight - 30, Math.max(4, targetRect.top + 18)),
      };
    } else if (arrow === "left") {
      targetArrow = {
        glyph: "←",
        left: Math.min(viewportWidth - 30, targetRect.right + 8),
        top: Math.min(viewportHeight - 30, Math.max(4, targetRect.top + 18)),
      };
    } else if (arrow === "top") {
      targetArrow = {
        glyph: "↑",
        left: Math.min(viewportWidth - 30, Math.max(4, targetRect.left + targetRect.width / 2 - 13)),
        top: Math.min(viewportHeight - 30, targetRect.bottom + 8),
      };
    } else {
      targetArrow = {
        glyph: "↓",
        left: Math.min(viewportWidth - 30, Math.max(4, targetRect.left + targetRect.width / 2 - 13)),
        top: Math.max(4, targetRect.top - 34),
      };
    }
  }

  return (
    <div className="fred-guided-tour-layer" aria-live="polite">
      {targetRect ? (
        <div
          className="fred-tour-spotlight"
          style={{
            left: `${Math.max(4, targetRect.left - 7)}px`,
            top: `${Math.max(4, targetRect.top - 7)}px`,
            width: `${Math.min(viewportWidth - 8, targetRect.width + 14)}px`,
            height: `${Math.min(viewportHeight - 8, targetRect.height + 14)}px`,
          }}
        />
      ) : (
        <div className="fred-tour-scrim" />
      )}
      {targetArrow && (
        <div
          className="fred-tour-target-arrow"
          style={{ left: `${targetArrow.left}px`, top: `${targetArrow.top}px` }}
          aria-hidden="true"
        >
          {targetArrow.glyph}
        </div>
      )}

      <section
        ref={cardRef}
        className={`fred-tour-card arrow-${arrow}${compactModal ? " compact-modal" : ""}`}
        style={{ left: `${cardLeft}px`, top: `${cardTop}px`, width: `${cardWidth}px` }}
        role="dialog"
        aria-modal="false"
        aria-labelledby="guided-tour-title"
      >
        <div className="fred-tour-card-head">
          <div>
            <span>{definition.eyebrow}</span>
            <strong>{stepNumber} of {GUIDED_TUTORIAL_STEPS.length}</strong>
          </div>
          <button type="button" onClick={onExit} aria-label="Exit guided tutorial">
            Exit
          </button>
        </div>
        <div className="fred-tour-progress" aria-hidden="true">
          <i style={{ width: `${(stepNumber / GUIDED_TUTORIAL_STEPS.length) * 100}%` }} />
        </div>
        <h2 id="guided-tour-title">{definition.title}</h2>
        <p>{definition.body}</p>
        <div className="fred-tour-instruction">
          <span aria-hidden="true">→</span>
          <strong>{definition.instruction}</strong>
        </div>
        <div className="fred-tour-card-footer">
          {definition.manualNext ? (
            <button
              ref={actionRef}
              type="button"
              className="primary"
              onClick={definition.final ? onExit : onNext}
            >
              {definition.final ? "Finish tutorial" : "Start guided case"}
            </button>
          ) : (
            <span>Complete the highlighted action to continue</span>
          )}
        </div>
      </section>
    </div>
  );
}
