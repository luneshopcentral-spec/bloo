"use client";

import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { expandAbbrevs } from "@/lib/scoring/abbreviations";
import type { FormState } from "@/components/simulator/state";
import type { DispenseDecision, PracticeCase } from "@/lib/types/case";
import {
  CASE1_CLEAR_LABEL_FACES,
  CASE1_PACK_OPTIONS,
  type Case1AssemblySubmission,
  type PackFace,
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

const ROTATION: Record<PackFace, string> = {
  front: "rotateX(0deg) rotateY(0deg)",
  right: "rotateX(0deg) rotateY(-90deg)",
  back: "rotateX(0deg) rotateY(-180deg)",
  left: "rotateX(0deg) rotateY(90deg)",
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
  const [mainLabelFace, setMainLabelFace] = useState<PackFace | null>(null);
  const [warningFaces, setWarningFaces] = useState<Record<string, PackFace>>(() =>
    answersRevealed
      ? Object.fromEntries(Array.from(initialWarnings).map((warning) => [warning, "back" as PackFace]))
      : {}
  );

  const selectedPack = CASE1_PACK_OPTIONS.find((pack) => pack.id === selectedPackId) ?? null;
  const item = formState.items[0];
  const placedWarningCount = Object.keys(warningFaces).length;
  const canComplete = Boolean(selectedPackId && mainLabelFace);
  const mainLabelPlacementOkay = mainLabelFace !== null && CASE1_CLEAR_LABEL_FACES.includes(mainLabelFace);

  const warningOptions = useMemo(() => {
    const unique = new Set([...PROTOTYPE_WARNINGS, ...caseData.items[0].correctWarnings]);
    return Array.from(unique);
  }, [caseData]);

  function choosePack(packId: string) {
    if (packId === selectedPackId) return;
    setSelectedPackId(packId);
    setActiveFace("front");
    setArmedSticker(null);
    setMainLabelFace(null);
    setWarningFaces(
      answersRevealed
        ? Object.fromEntries(Array.from(initialWarnings).map((warning) => [warning, "back" as PackFace]))
        : {}
    );
  }

  function applySticker(token: StickerToken, face: PackFace) {
    if (token === "main-label") {
      setMainLabelFace(face);
    } else {
      const warning = token.slice("warning:".length);
      setWarningFaces((previous) => ({ ...previous, [warning]: face }));
    }
    setArmedSticker(null);
  }

  function removeMainLabel() {
    setMainLabelFace(null);
    setArmedSticker(null);
  }

  function removeWarning(warning: string) {
    setWarningFaces((previous) => {
      const next = { ...previous };
      delete next[warning];
      return next;
    });
    setArmedSticker(null);
  }

  function handleDragStart(event: DragEvent<HTMLElement>, token: StickerToken) {
    event.dataTransfer.setData("text/plain", token);
    event.dataTransfer.effectAllowed = "move";
    setArmedSticker(token);
  }

  function handleDrop(event: DragEvent<HTMLElement>, face: PackFace) {
    event.preventDefault();
    const token = (event.dataTransfer.getData("text/plain") || armedSticker) as StickerToken | null;
    if (token) applySticker(token, face);
  }

  function handleFaceClick(face: PackFace) {
    if (armedSticker) applySticker(armedSticker, face);
  }

  function resetBench() {
    setSelectedPackId(null);
    setActiveFace("front");
    setArmedSticker(null);
    setMainLabelFace(null);
    setWarningFaces({});
  }

  function submitAssembly() {
    if (!selectedPackId || !mainLabelFace) return;
    onComplete({
      packId: selectedPackId,
      mainLabelFace,
      warningLabels: Object.keys(warningFaces),
    });
  }

  return (
    <main className="fred-assembly-stage">
      <header className="fred-assembly-header">
        <div>
          <div className="fred-stage-kicker">Stage 2 of 3 · Physical pack assembly · Case 1 prototype</div>
          <h1>Choose, check and label the medicine pack</h1>
          <p>Match every product detail, rotate the carton, then apply the dispensing and warning labels yourself.</p>
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
              <p>Select a sticker, then click a carton face—or drag it directly onto the face.</p>
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
                        onClick={() => handleFaceClick(face)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, face)}
                        role={activeFace === face && armedSticker ? "button" : undefined}
                        tabIndex={activeFace === face && armedSticker ? 0 : -1}
                        onKeyDown={(event) => {
                          if ((event.key === "Enter" || event.key === " ") && armedSticker) {
                            event.preventDefault();
                            applySticker(armedSticker, face);
                          }
                        }}
                        aria-label={`${faceLabel(face)} face${activeFace === face ? ", visible" : ""}`}
                      >
                        <CartonFaceContent face={face} pack={selectedPack} />

                        {mainLabelFace === face && (
                          <button
                            type="button"
                            className="fred-applied-main-label"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeMainLabel();
                            }}
                            title="Remove dispensing label"
                          >
                            <strong>{item.drug || caseData.items[0].drug}</strong>
                            <span>{expandAbbrevs(item.directions)}</span>
                            <b>{patientName || caseData.patientLookup.prescriptionPatient.name}</b>
                            <small>Qty {item.qty} · {item.repeats} Rpt · click to remove</small>
                          </button>
                        )}

                        <div className="fred-applied-warning-stack">
                          {Object.entries(warningFaces)
                            .filter(([, placedFace]) => placedFace === face)
                            .map(([warning]) => (
                              <button
                                key={warning}
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeWarning(warning);
                                }}
                                title={`Remove ${warning}`}
                              >
                                {warning} <b>×</b>
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {armedSticker && (
                  <div className="fred-sticker-armed" role="status">
                    Sticker selected — choose the visible {faceLabel(activeFace).toLowerCase()} face to apply it.
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
                <span className={mainLabelFace ? "done" : ""}>
                  {mainLabelFace ? "✓" : "1"} Main label applied
                </span>
                <span className={placedWarningCount > 0 ? "done" : ""}>
                  {placedWarningCount > 0 ? "✓" : "2"} {placedWarningCount} warning label{placedWarningCount === 1 ? "" : "s"} applied
                </span>
                {mainLabelFace && (
                  <span className={mainLabelPlacementOkay ? "done" : "attention"}>
                    {mainLabelPlacementOkay ? "✓ Clear label panel" : "Review label position"}
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
              <p>The result is marked after you continue, so check before committing.</p>
            </div>
          </div>

          <div className="fred-sticker-group">
            <div className="fred-sticker-group-title">
              <strong>Dispensing label</strong>
              <span>{mainLabelFace ? `On ${faceLabel(mainLabelFace)}` : "Required"}</span>
            </div>
            <button
              type="button"
              draggable={Boolean(selectedPack)}
              onDragStart={(event) => handleDragStart(event, "main-label")}
              onClick={() => setArmedSticker("main-label")}
              className={`fred-main-label-sticker${armedSticker === "main-label" ? " armed" : ""}`}
              disabled={!selectedPack}
            >
              <strong>{item.drug || "Dispensing label"}</strong>
              <span>{item.directions ? expandAbbrevs(item.directions) : "Directions"}</span>
              <b>{patientName || "Patient name"}</b>
              <small>Qty {item.qty || "—"} · {item.repeats || "—"} Rpt</small>
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
                const placedFace = warningFaces[warning];
                return (
                  <button
                    key={warning}
                    type="button"
                    draggable={Boolean(selectedPack)}
                    onDragStart={(event) => handleDragStart(event, token)}
                    onClick={() => setArmedSticker(token)}
                    className={`${armedSticker === token ? "armed" : ""}${placedFace ? " placed" : ""}`}
                    disabled={!selectedPack}
                  >
                    <span>{warning}</span>
                    <small>{placedFace ? `On ${faceLabel(placedFace)}` : "Select"}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="fred-sticker-help">
            <strong>Placement check</strong>
            <p>Use the broad clear panel. Keep closures, medicine identity, batch and expiry information readable.</p>
            <p>Applied a sticker by mistake? Select it on the carton to remove it.</p>
          </div>
        </aside>
      </div>

      <footer className="fred-assembly-actions">
        <button type="button" className="secondary" onClick={onBack}>← Back to dispensing</button>
        <button type="button" className="secondary" onClick={resetBench}>Reset bench</button>
        <div className="fred-assembly-ready">
          <strong>{canComplete ? "Ready for your final pack check" : "Choose a pack and apply the main label"}</strong>
          <span>Warning-label selection is marked when you continue.</span>
        </div>
        <button type="button" className="primary" disabled={!canComplete} onClick={submitAssembly}>
          Continue to patient consultation →
        </button>
      </footer>
    </main>
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
        <small>{pack.brand}</small>
        <strong>{pack.generic}</strong>
        <b>{pack.strength}</b>
        <span>{pack.form}</span>
        <i>{pack.packSize}</i>
      </div>
    );
  }
  if (face === "back") {
    return (
      <div className="fred-carton-print back-print">
        <strong>Clear dispensing label panel</strong>
        <span>Apply the main label here without covering pack information.</span>
        <i>Pharmacist use</i>
      </div>
    );
  }
  if (face === "right") {
    return <div className="fred-carton-print side-print clear"><strong>Clear side panel</strong><span>Suitable for dispensing label</span></div>;
  }
  if (face === "left") {
    return <div className="fred-carton-print side-print"><strong>Batch</strong><span>MP240619</span><strong>Expiry</strong><span>06/2028</span></div>;
  }
  if (face === "top") {
    return <div className="fred-carton-print end-print"><strong>{pack.generic}</strong><span>{pack.strength} · {pack.form}</span><b>OPEN</b></div>;
  }
  return <div className="fred-carton-print end-print"><strong>{pack.brand}</strong><span>{pack.packSize}</span><b>SEALED END</b></div>;
}
