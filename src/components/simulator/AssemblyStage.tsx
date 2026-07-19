"use client";

import { useMemo, useState } from "react";
import type { DragEvent, MouseEvent as ReactMouseEvent } from "react";
import { expandAbbrevs } from "@/lib/scoring/abbreviations";
import type { FormState } from "@/components/simulator/state";
import type { DispenseDecision, PracticeCase } from "@/lib/types/case";
import {
  CASE1_PACK_OPTIONS,
  STICKER_DIMENSIONS,
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

const WARNING_CODES: Record<string, string> = {
  "Take with food or milk": "5",
  "Complete the full course": "3",
  "May cause nausea": "12",
  "May cause drowsiness": "15",
  "Avoid alcohol": "2",
  "Take with a full glass of water": "7",
  "Keep refrigerated": "6",
};

const ROTATION: Record<PackFace, string> = {
  front: "rotateX(-5deg) rotateY(-7deg)",
  right: "rotateX(-5deg) rotateY(-90deg)",
  back: "rotateX(-5deg) rotateY(-180deg)",
  left: "rotateX(-5deg) rotateY(90deg)",
  top: "rotateX(-90deg) rotateY(0deg)",
  bottom: "rotateX(90deg) rotateY(0deg)",
};

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

function centredPlacement(face: PackFace, kind: StickerKind): StickerPlacement {
  const size = STICKER_DIMENSIONS[kind];
  return {
    face,
    x: (100 - size.width) / 2,
    y: (100 - size.height) / 2,
  };
}

function pointerPlacement(
  event: ReactMouseEvent<HTMLElement> | DragEvent<HTMLElement>,
  face: PackFace,
  kind: StickerKind
): StickerPlacement {
  const rect = event.currentTarget.getBoundingClientRect();
  const size = STICKER_DIMENSIONS[kind];
  const x = ((event.clientX - rect.left) / rect.width) * 100 - size.width / 2;
  const y = ((event.clientY - rect.top) / rect.height) * 100 - size.height / 2;
  return {
    face,
    x: Math.max(0, Math.min(100 - size.width, x)),
    y: Math.max(0, Math.min(100 - size.height, y)),
  };
}

function initialWarningPlacements(
  initialWarnings: Set<string>,
  answersRevealed: boolean
): Record<string, StickerPlacement> {
  if (!answersRevealed) return {};
  const positions = [
    { x: 4, y: 55 },
    { x: 52, y: 55 },
    { x: 4, y: 68 },
  ];
  return Object.fromEntries(Array.from(initialWarnings).map((warning, index) => [
    warning,
    { face: "back" as PackFace, ...(positions[index] ?? { x: 52, y: 68 }) },
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

  const selectedPack = CASE1_PACK_OPTIONS.find((pack) => pack.id === selectedPackId) ?? null;
  const item = formState.items[0];
  const placedWarningCount = Object.keys(warningPlacements).length;
  const canComplete = Boolean(selectedPackId && mainLabelPlacement);

  const warningOptions = useMemo(() => {
    const unique = new Set([...PROTOTYPE_WARNINGS, ...caseData.items[0].correctWarnings]);
    return Array.from(unique);
  }, [caseData]);

  function choosePack(packId: string) {
    if (packId === selectedPackId) return;
    setSelectedPackId(packId);
    setActiveFace("front");
    setArmedSticker(null);
    setMainLabelPlacement(null);
    setWarningPlacements(initialWarningPlacements(initialWarnings, answersRevealed));
  }

  function applySticker(token: StickerToken, placement: StickerPlacement) {
    if (token === "main-label") {
      setMainLabelPlacement(placement);
    } else {
      const warning = token.slice("warning:".length);
      setWarningPlacements((previous) => ({ ...previous, [warning]: placement }));
    }
    setArmedSticker(null);
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

  function handleDragStart(event: DragEvent<HTMLElement>, token: StickerToken) {
    event.stopPropagation();
    event.dataTransfer.setData("text/plain", token);
    event.dataTransfer.effectAllowed = "move";
    setArmedSticker(token);
  }

  function handleDrop(event: DragEvent<HTMLElement>, face: PackFace) {
    event.preventDefault();
    const token = (event.dataTransfer.getData("text/plain") || armedSticker) as StickerToken | null;
    if (token) applySticker(token, pointerPlacement(event, face, stickerKind(token)));
  }

  function handleFaceClick(event: ReactMouseEvent<HTMLElement>, face: PackFace) {
    if (armedSticker) applySticker(armedSticker, pointerPlacement(event, face, stickerKind(armedSticker)));
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

  return (
    <main className="fred-assembly-stage">
      <header className="fred-assembly-header">
        <div>
          <div className="fred-stage-kicker">Stage 2 of 3 · Physical pack assembly · Case 1 prototype</div>
          <h1>Choose, check and label the medicine pack</h1>
          <p>Match every product detail, rotate the carton, then place the dispensing and warning labels yourself.</p>
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
              <h2 id="carton-bench-title">Rotate and prepare the carton</h2>
              <p>Drag a label anywhere on a face, or select it and click the exact position.</p>
            </div>
          </div>

          {selectedPack ? (
            <>
              <div className="fred-carton-viewer">
                <div className="fred-carton-scene" aria-label={`Rotatable ${selectedPack.generic} carton`}>
                  <div className="fred-carton-cube" style={{ transform: ROTATION[activeFace] }}>
                    {PACK_FACES.map((face) => (
                      <div
                        key={face}
                        className={`fred-carton-face face-${face} colour-${selectedPack.colour}${activeFace === face ? " active" : ""}`}
                        onClick={(event) => handleFaceClick(event, face)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, face)}
                        role={activeFace === face && armedSticker ? "button" : undefined}
                        tabIndex={activeFace === face && armedSticker ? 0 : -1}
                        onKeyDown={(event) => {
                          if ((event.key === "Enter" || event.key === " ") && armedSticker) {
                            event.preventDefault();
                            applySticker(armedSticker, centredPlacement(face, stickerKind(armedSticker)));
                          }
                        }}
                        aria-label={`${faceLabel(face)} face${activeFace === face ? ", visible" : ""}`}
                      >
                        <CartonFaceContent face={face} pack={selectedPack} />

                        {mainLabelPlacement?.face === face && (
                          <div
                            className="fred-applied-main-label"
                            style={placementStyle(mainLabelPlacement, "main")}
                            draggable
                            onDragStart={(event) => handleDragStart(event, "main-label")}
                            onClick={(event) => {
                              event.stopPropagation();
                              setArmedSticker("main-label");
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label="Move dispensing label"
                          >
                            <DispensingLabelSticker
                              item={item}
                              patientName={patientName || caseData.patientLookup.prescriptionPatient.name}
                              doctor={formState.doctor || caseData.doctor}
                              date={formState.scriptDate || caseData.date}
                            />
                            <button
                              type="button"
                              className="fred-remove-applied-sticker"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeMainLabel();
                              }}
                              aria-label="Remove dispensing label"
                            >×</button>
                          </div>
                        )}

                        {Object.entries(warningPlacements)
                          .filter(([, placement]) => placement.face === face)
                          .map(([warning, placement]) => {
                            const token: StickerToken = `warning:${warning}`;
                            return (
                              <div
                                key={warning}
                                className={`fred-applied-warning-label tone-${warningStickerTone(warning)}`}
                                style={placementStyle(placement, "warning")}
                                draggable
                                onDragStart={(event) => handleDragStart(event, token)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setArmedSticker(token);
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Move warning label: ${warning}`}
                              >
                                <b>{WARNING_CODES[warning] ?? "P"}</b>
                                <span>{warning}</span>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeWarning(warning);
                                  }}
                                  aria-label={`Remove ${warning}`}
                                >×</button>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
                {armedSticker && (
                  <div className="fred-sticker-armed" role="status">
                    Label selected — click the exact position on the visible {faceLabel(activeFace).toLowerCase()} face.
                  </div>
                )}
              </div>

              <div className="fred-carton-controls" aria-label="Carton face controls">
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

              <div className="fred-carton-checks" aria-live="polite">
                <span className={mainLabelPlacement ? "done" : ""}>
                  {mainLabelPlacement ? "✓" : "1"} Main label applied
                </span>
                <span className={placedWarningCount > 0 ? "done" : ""}>
                  {placedWarningCount > 0 ? "✓" : "2"} {placedWarningCount} warning label{placedWarningCount === 1 ? "" : "s"} applied
                </span>
                {mainLabelPlacement && (
                  <span className="position-recorded">
                    Position recorded on {faceLabel(mainLabelPlacement.face)} face
                  </span>
                )}
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
              <p>Label choice and placement are marked only after you continue.</p>
            </div>
          </div>

          <div className="fred-sticker-group">
            <div className="fred-sticker-group-title">
              <strong>Dispensing label</strong>
              <span>{mainLabelPlacement ? `On ${faceLabel(mainLabelPlacement.face)}` : "Required"}</span>
            </div>
            <button
              type="button"
              draggable={Boolean(selectedPack)}
              onDragStart={(event) => handleDragStart(event, "main-label")}
              onClick={() => setArmedSticker("main-label")}
              className={`fred-main-label-sticker${armedSticker === "main-label" ? " armed" : ""}`}
              disabled={!selectedPack}
            >
              <DispensingLabelSticker
                item={item}
                patientName={patientName || "Patient name"}
                doctor={formState.doctor || caseData.doctor}
                date={formState.scriptDate || caseData.date}
              />
            </button>
          </div>

          <div className="fred-sticker-group warning-group">
            <div className="fred-sticker-group-title">
              <strong>Warning label roll</strong>
              <span>Choose all that apply</span>
            </div>
            <div className="fred-warning-sticker-roll">
              {warningOptions.map((warning) => {
                const token: StickerToken = `warning:${warning}`;
                const placement = warningPlacements[warning];
                return (
                  <button
                    key={warning}
                    type="button"
                    draggable={Boolean(selectedPack)}
                    onDragStart={(event) => handleDragStart(event, token)}
                    onClick={() => setArmedSticker(token)}
                    className={`tone-${warningStickerTone(warning)}${armedSticker === token ? " armed" : ""}${placement ? " placed" : ""}`}
                    disabled={!selectedPack}
                  >
                    <b>{WARNING_CODES[warning] ?? "P"}</b>
                    <span>{warning}</span>
                    <small>{placement ? `On ${faceLabel(placement.face)}` : "Select"}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fred-sticker-help">
            <strong>Placement is part of the assessment</strong>
            <p>Do not cover the medicine name, strength, dose form, barcode, batch, expiry or carton openings.</p>
            <p>To move a label, select it on the carton and click a new position—or drag it again. Use × only to remove it.</p>
          </div>
        </aside>
      </div>

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

function DispensingLabelSticker({
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
    <span className="fred-dispensing-label-print">
      <i>KEEP OUT OF REACH OF CHILDREN</i>
      <strong>{item.drug || "Dispensing label"}</strong>
      <em>{item.directions ? expandAbbrevs(item.directions) : "Directions"}</em>
      <b>{patientName}</b>
      <small>{date} · Dr {doctor} · Qty {item.qty || "—"} · {item.repeats || "—"} Rpt</small>
      <span>TRAINING PHARMACY · DISPENSING PRACTICE</span>
    </span>
  );
}

function placementStyle(placement: StickerPlacement, kind: StickerKind) {
  const size = STICKER_DIMENSIONS[kind];
  return {
    left: `${placement.x}%`,
    top: `${placement.y}%`,
    width: `${size.width}%`,
    height: `${size.height}%`,
  };
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
