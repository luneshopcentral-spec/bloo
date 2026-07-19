"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { expandAbbrevs } from "@/lib/scoring/abbreviations";
import type { FormState } from "@/components/simulator/state";
import { MedicinesReferenceDesk } from "@/components/simulator/MedicinesReferenceDesk";
import type { DispenseDecision, PracticeCase } from "@/lib/types/case";
import {
  ASSEMBLY_MM_PX,
  CASE1_ANCILLARY_TEXT,
  CASE1_PACK_OPTIONS,
  CASE1_WARNING_CODES,
  FACE_PHYSICAL,
  STICKER_PHYSICAL,
  stickerSizePercent,
  warningStickerTone,
  type Case1AssemblySubmission,
  type PackFace,
  type StickerKind,
  type StickerPlacement,
} from "@/lib/assembly/case1";

interface AssemblyStageProps {
  caseData: PracticeCase;
  formState: FormState;
  patientName: string;
  decision: DispenseDecision | null;
  initialWarnings: Set<string>;
  answersRevealed: boolean;
  onBack: () => void;
  onComplete: (submission: Case1AssemblySubmission) => void;
}

type StickerToken = "main-label" | `warning:${string}`;

const PACK_FACES: PackFace[] = ["front", "right", "back", "left", "top", "bottom"];
const PROTOTYPE_WARNINGS = [
  "Take with food or milk",
  "Complete the full course",
  "May cause nausea",
  "May cause drowsiness",
  "Avoid alcohol",
  "Take with a full glass of water",
  "Keep refrigerated",
];

const DRAG_THRESHOLD = 4;

function decisionLabel(decision: DispenseDecision | null): string {
  if (decision === "dispense") return "Dispense after final check";
  if (decision === "hold_contact_prescriber") return "Hold and contact prescriber";
  if (decision === "do_not_supply") return "Do not supply";
  return "No decision recorded";
}

function faceLabel(face: PackFace): string {
  return `${face.charAt(0).toUpperCase()}${face.slice(1)}`;
}

function stickerKind(token: StickerToken): StickerKind {
  return token === "main-label" ? "main" : "warning";
}

function warningOf(token: StickerToken): string {
  return token.slice("warning:".length);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normaliseRotation(rotation: number): number {
  const normalised = rotation % 360;
  return normalised < 0 ? normalised + 360 : normalised;
}

/**
 * Map a screen point to a placement on a *flat* (untransformed) face. Because
 * the editing face is face-on, getBoundingClientRect gives its true coordinate
 * grid, so this is exact for every face. The label is clamped by its rotated
 * bounding box, so a turned label can still sit right up against an edge.
 */
function placementFromPoint(
  clientX: number,
  clientY: number,
  faceRect: DOMRect,
  face: PackFace,
  kind: StickerKind,
  rotation: number
): StickerPlacement {
  const size = stickerSizePercent(face, kind);
  const radians = (rotation * Math.PI) / 180;
  const halfW = (Math.abs(size.width * Math.cos(radians)) + Math.abs(size.height * Math.sin(radians))) / 2;
  const halfH = (Math.abs(size.width * Math.sin(radians)) + Math.abs(size.height * Math.cos(radians))) / 2;
  const centreX = clamp(((clientX - faceRect.left) / faceRect.width) * 100, halfW, 100 - halfW);
  const centreY = clamp(((clientY - faceRect.top) / faceRect.height) * 100, halfH, 100 - halfH);
  return {
    face,
    x: centreX - size.width / 2,
    y: centreY - size.height / 2,
    rotation,
  };
}

function facePixelSize(face: PackFace): { width: number; height: number } {
  return {
    width: FACE_PHYSICAL[face].w * ASSEMBLY_MM_PX,
    height: FACE_PHYSICAL[face].h * ASSEMBLY_MM_PX,
  };
}

function stickerPixelSize(kind: StickerKind): { width: number; height: number } {
  return {
    width: STICKER_PHYSICAL[kind].w * ASSEMBLY_MM_PX,
    height: STICKER_PHYSICAL[kind].h * ASSEMBLY_MM_PX,
  };
}

function initialWarningPlacements(
  initialWarnings: Set<string>,
  answersRevealed: boolean
): Record<string, StickerPlacement> {
  if (!answersRevealed) return {};
  const positions = [
    { x: 4, y: 55 },
    { x: 42, y: 55 },
    { x: 4, y: 74 },
  ];
  return Object.fromEntries(Array.from(initialWarnings).map((warning, index) => [
    warning,
    { face: "back" as PackFace, ...(positions[index] ?? { x: 42, y: 74 }), rotation: 0 },
  ]));
}

export function AssemblyStage({
  caseData,
  formState,
  patientName,
  decision,
  initialWarnings,
  answersRevealed,
  onBack,
  onComplete,
}: AssemblyStageProps) {
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [activeFace, setActiveFace] = useState<PackFace>("front");
  const [armedSticker, setArmedSticker] = useState<StickerToken | null>(null);
  const [mainLabelPlacement, setMainLabelPlacement] = useState<StickerPlacement | null>(null);
  const [warningPlacements, setWarningPlacements] = useState<Record<string, StickerPlacement>>(() =>
    initialWarningPlacements(initialWarnings, answersRevealed)
  );
  const [dragToken, setDragToken] = useState<StickerToken | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const faceRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ token: StickerToken; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const selectedPack = CASE1_PACK_OPTIONS.find((pack) => pack.id === selectedPackId) ?? null;
  const item = formState.items[0];
  const placedWarningCount = Object.keys(warningPlacements).length;
  const canComplete = Boolean(selectedPackId && mainLabelPlacement);
  const armedWarning = armedSticker && armedSticker !== "main-label" ? warningOf(armedSticker) : null;
  const armedPlacement = armedSticker === "main-label"
    ? mainLabelPlacement
    : armedWarning
      ? warningPlacements[armedWarning] ?? null
      : null;

  const warningOptions = useMemo(() => {
    const unique = new Set([...PROTOTYPE_WARNINGS, ...caseData.items[0].correctWarnings]);
    return Array.from(unique);
  }, [caseData]);

  const placementOf = useCallback((token: StickerToken): StickerPlacement | null => {
    if (token === "main-label") return mainLabelPlacement;
    return warningPlacements[warningOf(token)] ?? null;
  }, [mainLabelPlacement, warningPlacements]);

  const applySticker = useCallback((token: StickerToken, placement: StickerPlacement) => {
    if (token === "main-label") {
      setMainLabelPlacement(placement);
    } else {
      const warning = warningOf(token);
      setWarningPlacements((previous) => ({ ...previous, [warning]: placement }));
    }
    setArmedSticker(token);
  }, []);

  // ── Pointer drag (works identically for tray chips and placed labels) ──
  // Window listeners are stable references (via refs) so the exact functions
  // added on drag-start are the ones removed on drag-end, regardless of how the
  // drag logic re-memoises.
  const moveLogic = useRef<(event: PointerEvent) => void>(() => {});
  const upLogic = useRef<(event: PointerEvent) => void>(() => {});
  const stableMove = useRef((event: PointerEvent) => moveLogic.current(event)).current;
  const stableUp = useRef((event: PointerEvent) => upLogic.current(event)).current;

  const stopDrag = useCallback(() => {
    dragState.current = null;
    setDragToken(null);
    setGhost(null);
    window.removeEventListener("pointermove", stableMove);
    window.removeEventListener("pointerup", stableUp);
  }, [stableMove, stableUp]);

  moveLogic.current = (event: PointerEvent) => {
    const state = dragState.current;
    if (!state) return;
    if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > DRAG_THRESHOLD) {
      state.moved = true;
      setDragToken(state.token);
    }
    if (state.moved) setGhost({ x: event.clientX, y: event.clientY });
  };

  upLogic.current = (event: PointerEvent) => {
    const state = dragState.current;
    stopDrag();
    if (!state) return;
    if (state.moved) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
      const faceRect = faceRef.current?.getBoundingClientRect();
      if (
        faceRect
        && event.clientX >= faceRect.left && event.clientX <= faceRect.right
        && event.clientY >= faceRect.top && event.clientY <= faceRect.bottom
      ) {
        const rotation = placementOf(state.token)?.rotation ?? 0;
        applySticker(state.token, placementFromPoint(event.clientX, event.clientY, faceRect, activeFace, stickerKind(state.token), rotation));
      }
      // Dropped off the face: a placed label keeps its position; a tray chip is
      // simply not applied.
    } else {
      // A tap selects/deselects for rotation and click-to-place.
      setArmedSticker((previous) => (previous === state.token ? null : state.token));
    }
  };

  const beginDrag = useCallback((event: React.PointerEvent, token: StickerToken) => {
    if (!selectedPack) return;
    event.preventDefault();
    dragState.current = { token, startX: event.clientX, startY: event.clientY, moved: false };
    window.addEventListener("pointermove", stableMove);
    window.addEventListener("pointerup", stableUp);
  }, [selectedPack, stableMove, stableUp]);

  useEffect(() => () => {
    window.removeEventListener("pointermove", stableMove);
    window.removeEventListener("pointerup", stableUp);
  }, [stableMove, stableUp]);

  function handleFaceClick(event: React.MouseEvent<HTMLDivElement>) {
    if (suppressClick.current || !armedSticker) return;
    // Clicking an existing label selects it (handled by its own tap), never
    // re-places the armed one on top of it.
    if ((event.target as HTMLElement).closest("[data-placed-label]")) return;
    const faceRect = faceRef.current?.getBoundingClientRect();
    if (!faceRect) return;
    const rotation = placementOf(armedSticker)?.rotation ?? 0;
    applySticker(armedSticker, placementFromPoint(event.clientX, event.clientY, faceRect, activeFace, stickerKind(armedSticker), rotation));
  }

  function choosePack(packId: string) {
    if (packId === selectedPackId) return;
    setSelectedPackId(packId);
    setActiveFace("front");
    setArmedSticker(null);
    setMainLabelPlacement(null);
    setWarningPlacements(initialWarningPlacements(initialWarnings, answersRevealed));
  }

  function removeMainLabel() {
    setMainLabelPlacement(null);
    setArmedSticker(null);
  }

  function removeWarning(warning: string) {
    setWarningPlacements((previous) => {
      const next = { ...previous };
      delete next[warning];
      return next;
    });
    setArmedSticker(null);
  }

  function rotateArmed(delta: number) {
    if (!armedSticker) return;
    const placement = placementOf(armedSticker);
    if (!placement) return;
    applySticker(armedSticker, { ...placement, rotation: normaliseRotation(placement.rotation + delta) });
  }

  function resetBench() {
    setSelectedPackId(null);
    setActiveFace("front");
    setArmedSticker(null);
    setMainLabelPlacement(null);
    setWarningPlacements({});
  }

  function submitAssembly() {
    if (!selectedPackId || !mainLabelPlacement) return;
    onComplete({
      packId: selectedPackId,
      mainLabelPlacement,
      warningLabels: Object.keys(warningPlacements),
      warningPlacements,
    });
  }

  const facePx = facePixelSize(activeFace);
  const dispensingContext = {
    item,
    patientName: patientName || caseData.patientLookup.prescriptionPatient.name,
    doctor: formState.doctor || caseData.doctor,
    date: formState.scriptDate || caseData.date,
  };

  return (
    <main className="fred-assembly-stage">
      <header className="fred-assembly-header">
        <div>
          <div className="fred-stage-kicker">Stage 2 of 3 · Physical pack assembly · Case 1 prototype</div>
          <h1>Choose, check and label the medicine pack</h1>
          <p>Match every product detail, turn to each panel, then place the dispensing and warning labels yourself.</p>
        </div>
        <div className="fred-assembly-decision">
          <span>Your recorded clinical decision</span>
          <strong>{decisionLabel(decision)}</strong>
        </div>
      </header>

      <div className="fred-assembly-safety-note" role="note">
        <strong>Prototype note:</strong> Case 1 still assesses the early-repeat hold decision. This bench separately tests
        physical product and label handling; a held pack must not be handed to the patient in real practice.
      </div>

      <section className="fred-assembly-order" aria-label="Prescription order to assemble">
        <span>Prescription order</span>
        <strong>{caseData.items[0].drug}</strong>
        <span>{expandAbbrevs(item.directions)} · Qty {item.qty} · {item.repeats} repeat</span>
      </section>

      <div className="fred-assembly-workbench">
        <section className="fred-pack-shelf" aria-labelledby="pack-shelf-title">
          <div className="fred-assembly-section-heading">
            <span>1</span>
            <div>
              <h2 id="pack-shelf-title">Choose the physical pack</h2>
              <p>Lookalikes differ by medicine, strength, form, manufacturer or pack size.</p>
            </div>
          </div>

          <div className="fred-pack-options">
            {CASE1_PACK_OPTIONS.map((pack) => {
              const selected = pack.id === selectedPackId;
              return (
                <button
                  key={pack.id}
                  type="button"
                  className={`fred-pack-option colour-${pack.colour}${selected ? " selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => choosePack(pack.id)}
                >
                  <span className="fred-mini-carton" aria-hidden="true">
                    <i />
                    <b>{pack.generic.slice(0, 3).toUpperCase()}</b>
                    <small>{pack.strength}</small>
                  </span>
                  <span className="fred-pack-option-copy">
                    <small>{pack.brand}</small>
                    <strong>{pack.generic} {pack.strength}</strong>
                    <span>{pack.form} · {pack.packSize}</span>
                  </span>
                  <span className="fred-pack-select-state">{selected ? "Selected" : "Choose"}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="fred-carton-bench" aria-labelledby="carton-bench-title">
          <div className="fred-assembly-section-heading">
            <span>2</span>
            <div>
              <h2 id="carton-bench-title">Turn the carton and place labels</h2>
              <p>Drag a label onto the panel, or select it and click the exact spot. Turn to a panel with the buttons below.</p>
            </div>
          </div>

          {selectedPack ? (
            <>
              <div className="fred-face-viewport">
                <div
                  ref={faceRef}
                  className={`fred-face-panel colour-${selectedPack.colour}`}
                  style={{ width: `${facePx.width}px`, height: `${facePx.height}px` }}
                  onClick={handleFaceClick}
                  aria-label={`${faceLabel(activeFace)} panel of the ${selectedPack.generic} carton`}
                >
                  <CartonFaceContent face={activeFace} pack={selectedPack} />

                  {mainLabelPlacement?.face === activeFace && (
                    <PlacedLabel
                      token="main-label"
                      placement={mainLabelPlacement}
                      selected={armedSticker === "main-label"}
                      onPointerDown={(event) => beginDrag(event, "main-label")}
                      onRemove={removeMainLabel}
                    >
                      <DispensingLabelContent {...dispensingContext} />
                    </PlacedLabel>
                  )}

                  {Object.entries(warningPlacements)
                    .filter(([, placement]) => placement.face === activeFace)
                    .map(([warning, placement]) => {
                      const token: StickerToken = `warning:${warning}`;
                      return (
                        <PlacedLabel
                          key={warning}
                          token={token}
                          placement={placement}
                          selected={armedSticker === token}
                          tone={warningStickerTone(warning)}
                          onPointerDown={(event) => beginDrag(event, token)}
                          onRemove={() => removeWarning(warning)}
                        >
                          <WarningLabelContent warning={warning} />
                        </PlacedLabel>
                      );
                    })}
                </div>
              </div>

              <div className="fred-carton-controls" aria-label="Carton panel controls">
                {PACK_FACES.map((face) => (
                  <button
                    key={face}
                    type="button"
                    className={activeFace === face ? "active" : ""}
                    aria-pressed={activeFace === face}
                    onClick={() => setActiveFace(face)}
                  >
                    {faceLabel(face)}
                  </button>
                ))}
              </div>

              {armedSticker && armedPlacement && (
                <div className="fred-label-transform-controls" role="group" aria-label="Selected label rotation">
                  <span>
                    Selected: {armedSticker === "main-label" ? "dispensing label" : armedWarning}
                    <b>{Math.round(armedPlacement.rotation)}°</b>
                  </span>
                  <button type="button" onClick={() => rotateArmed(-15)}>↶ 15°</button>
                  <button type="button" onClick={() => rotateArmed(15)}>15° ↷</button>
                  <button type="button" onClick={() => rotateArmed(90)}>Turn 90°</button>
                  <button type="button" onClick={() => setArmedSticker(null)}>Done</button>
                </div>
              )}

              <div className="fred-carton-checks" aria-live="polite">
                <span className={mainLabelPlacement ? "done" : ""}>
                  {mainLabelPlacement ? "✓" : "1"} Dispensing label {mainLabelPlacement ? `on ${faceLabel(mainLabelPlacement.face)}` : "not placed"}
                </span>
                <span className={placedWarningCount > 0 ? "done" : ""}>
                  {placedWarningCount > 0 ? "✓" : "2"} {placedWarningCount} warning label{placedWarningCount === 1 ? "" : "s"} placed
                </span>
              </div>
            </>
          ) : (
            <div className="fred-carton-empty">
              <span aria-hidden="true">▱</span>
              <strong>No carton on the bench</strong>
              <p>Choose one pack from the shelf to inspect it from every side.</p>
            </div>
          )}
        </section>

        <aside className="fred-sticker-tray" aria-labelledby="sticker-tray-title">
          <div className="fred-assembly-section-heading">
            <span>3</span>
            <div>
              <h2 id="sticker-tray-title">Apply the labels</h2>
              <p>Drag a label onto the panel, or tap it then click the panel. Labels are shown at their real size.</p>
            </div>
          </div>

          <div className="fred-assembly-reference-row">
            <div>
              <strong>Medicines reference book</strong>
              <span>Check the exact product and applicable ancillary labels.</span>
            </div>
            <MedicinesReferenceDesk medicineName={selectedPack?.generic ?? item.drug} />
          </div>

          <div className="fred-sticker-group">
            <div className="fred-sticker-group-title">
              <strong>Dispensing label</strong>
              <span>{mainLabelPlacement ? `On ${faceLabel(mainLabelPlacement.face)}` : "Required"}</span>
            </div>
            <div
              className={`fred-label-chip${!selectedPack ? " disabled" : ""}${armedSticker === "main-label" ? " armed" : ""}${mainLabelPlacement ? " placed" : ""}`}
              style={{ width: `${stickerPixelSize("main").width}px`, height: `${stickerPixelSize("main").height}px` }}
              onPointerDown={(event) => beginDrag(event, "main-label")}
              role="button"
              tabIndex={selectedPack ? 0 : -1}
              aria-label="Dispensing label — drag onto the panel or tap to select"
              aria-disabled={!selectedPack}
            >
              <DispensingLabelContent {...dispensingContext} patientName={patientName || "Patient name"} />
            </div>
          </div>

          <div className="fred-sticker-group warning-group">
            <div className="fred-sticker-group-title">
              <strong>Warning label roll</strong>
              <span>Choose all that apply</span>
            </div>
            <div className="fred-warning-chip-roll">
              {warningOptions.map((warning) => {
                const token: StickerToken = `warning:${warning}`;
                const placement = warningPlacements[warning];
                return (
                  <div
                    key={warning}
                    className={`fred-label-chip warning tone-${warningStickerTone(warning)}${!selectedPack ? " disabled" : ""}${armedSticker === token ? " armed" : ""}${placement ? " placed" : ""}`}
                    style={{ width: `${stickerPixelSize("warning").width}px`, height: `${stickerPixelSize("warning").height}px` }}
                    onPointerDown={(event) => beginDrag(event, token)}
                    role="button"
                    tabIndex={selectedPack ? 0 : -1}
                    aria-label={`Warning label: ${warning}${placement ? `, on ${faceLabel(placement.face)}` : ""}`}
                    aria-disabled={!selectedPack}
                  >
                    <WarningLabelContent warning={warning} />
                    {placement && <span className="fred-chip-placed-flag">On {faceLabel(placement.face)}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="fred-sticker-help">
            <strong>Placement is part of the assessment</strong>
            <p>Do not cover the medicine name, strength, dose form, barcode, batch, expiry or carton openings.</p>
            <p>To move a label, drag it again or select it and click a new spot. Use × only to remove it.</p>
          </div>
        </aside>
      </div>

      {dragToken && ghost && (
        <div
          className={`fred-sticker-ghost${dragToken === "main-label" ? " main" : ` warning tone-${warningStickerTone(warningOf(dragToken))}`}`}
          style={{
            left: `${ghost.x}px`,
            top: `${ghost.y}px`,
            width: `${stickerPixelSize(stickerKind(dragToken)).width}px`,
            height: `${stickerPixelSize(stickerKind(dragToken)).height}px`,
            transform: `translate(-50%, -50%) rotate(${placementOf(dragToken)?.rotation ?? 0}deg)`,
          }}
          aria-hidden="true"
        >
          {dragToken === "main-label"
            ? <DispensingLabelContent {...dispensingContext} />
            : <WarningLabelContent warning={warningOf(dragToken)} />}
        </div>
      )}

      <footer className="fred-assembly-actions">
        <button type="button" className="secondary" onClick={onBack}>← Back to dispensing</button>
        <button type="button" className="secondary" onClick={resetBench}>Reset bench</button>
        <div className="fred-assembly-ready">
          <strong>{canComplete ? "Ready for your final pack check" : "Choose a pack and apply the main label"}</strong>
          <span>Warning-label selection and all label positions are marked when you continue.</span>
        </div>
        <button type="button" className="primary" disabled={!canComplete} onClick={submitAssembly}>
          Continue to patient consultation →
        </button>
      </footer>
    </main>
  );
}

interface PlacedLabelProps {
  token: StickerToken;
  placement: StickerPlacement;
  selected: boolean;
  tone?: string;
  onPointerDown: (event: React.PointerEvent) => void;
  onRemove: () => void;
  children: React.ReactNode;
}

function PlacedLabel({ token, placement, selected, tone, onPointerDown, onRemove, children }: PlacedLabelProps) {
  const kind = stickerKind(token);
  const size = stickerSizePercent(placement.face, kind);
  const className = kind === "main"
    ? `fred-label-chip placed-on-face main${selected ? " selected" : ""}`
    : `fred-label-chip placed-on-face warning tone-${tone}${selected ? " selected" : ""}`;
  return (
    <div
      data-placed-label
      className={className}
      style={{
        position: "absolute",
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        width: `${size.width}%`,
        height: `${size.height}%`,
        transform: `rotate(${placement.rotation}deg)`,
        transformOrigin: "center",
      }}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={0}
      aria-label={token === "main-label" ? "Dispensing label — drag to move" : `Warning label — drag to move`}
    >
      {children}
      <button
        type="button"
        className="fred-remove-applied-sticker"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        aria-label="Remove label"
      >×</button>
    </div>
  );
}

function DispensingLabelContent({
  item,
  patientName,
  doctor,
  date,
}: {
  item: FormState["items"][number];
  patientName: string;
  doctor: string;
  date: string;
}) {
  return (
    <span className="fred-label-render main">
      <i>KEEP OUT OF REACH OF CHILDREN</i>
      <strong>{item.drug || "Dispensing label"}</strong>
      <em>{item.directions ? expandAbbrevs(item.directions) : "Directions"}</em>
      <b>{patientName}</b>
      <small>{date} · Dr {doctor} · Qty {item.qty || "—"} · {item.repeats || "—"} Rpt</small>
      <span className="fred-label-footer">TRAINING PHARMACY · DISPENSING PRACTICE</span>
    </span>
  );
}

function WarningLabelContent({ warning }: { warning: string }) {
  return (
    <span className="fred-label-render warning">
      <b className="fred-warning-code">{CASE1_WARNING_CODES[warning] ?? "P"}</b>
      <span className="fred-warning-text">{CASE1_ANCILLARY_TEXT[warning] ?? warning}</span>
    </span>
  );
}

function CartonFaceContent({
  face,
  pack,
}: {
  face: PackFace;
  pack: (typeof CASE1_PACK_OPTIONS)[number];
}) {
  if (face === "front") {
    return (
      <div className="fred-carton-print front-print">
        <small>PRESCRIPTION ONLY MEDICINE · KEEP OUT OF REACH OF CHILDREN</small>
        <i>{pack.brand}</i>
        <strong>{pack.generic}</strong>
        <b>{pack.strength}</b>
        <span>{pack.form}</span>
        <em>{pack.packSize}</em>
      </div>
    );
  }
  if (face === "back") {
    return (
      <div className="fred-carton-print back-print">
        <div className="fred-carton-fine-print">
          <strong>Storage and product information</strong>
          <span>Store below 25°C. Protect from light and moisture.</span>
          <span>Mayne Pharma Australia · AUST R 1404X</span>
        </div>
        <div className="fred-carton-barcode" aria-hidden="true" />
      </div>
    );
  }
  if (face === "right") {
    return (
      <div className="fred-carton-print side-print clear">
        <small>DISPENSING PANEL</small>
        <div className="fred-batch-strip"><strong>Batch</strong> MP240619 <strong>EXP</strong> 06/2028</div>
      </div>
    );
  }
  if (face === "left") {
    return (
      <div className="fred-carton-print side-print info-heavy">
        <strong>ERYTHROMYCIN</strong>
        <span>250 mg capsules</span>
        <div className="fred-carton-barcode" aria-hidden="true" />
        <strong>Batch MP240619</strong>
        <span>Expiry 06/2028</span>
      </div>
    );
  }
  if (face === "top") {
    return <div className="fred-carton-print end-print"><strong>{pack.generic}</strong><span>{pack.strength} · {pack.form}</span><b>OPEN HERE</b></div>;
  }
  return <div className="fred-carton-print end-print"><strong>{pack.brand}</strong><span>{pack.packSize}</span><b>SEALED END</b></div>;
}
