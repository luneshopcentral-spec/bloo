"use client";

import { useState, useReducer, useEffect, useMemo } from "react";
import "./simulator.css";

import { STATIC_CASES, ALL_WARNINGS } from "@/lib/cases/static-cases";
import { applyCaseVariant } from "@/lib/cases/variants";
import { formReducer, emptyFormStateFor } from "@/components/simulator/state";
import { validateDispense } from "@/lib/scoring/validate";
import { getDispenseReadinessIssues } from "@/lib/scoring/readiness";
import type { DispenseResult } from "@/lib/scoring/types";
import type { AttemptResult, CounsellingResult } from "@/lib/conversation/types";
import { combineAttemptResults } from "@/lib/conversation/score";
import { getConversationCase } from "@/lib/conversation/cases";
import type { DispenseDecision } from "@/lib/types/case";
import type { Patient, PatientScript } from "@/lib/types/patient";
import type { DrugRow } from "@/lib/types/drug";
import type { Prescriber } from "@/lib/types/prescriber";
import { formatPrescriberName } from "@/lib/types/prescriber";
import { createClient } from "@/lib/supabase/client";
import { findLocalDrugBySeedId, findLocalPrescriberByNumber } from "@/lib/directory/local-fallback";
import { getCaseEditorialRecord } from "@/lib/governance/editorial";
import type { PracticeMode } from "@/lib/practice/modes";
import { persistCompletedAttempt } from "@/lib/attempts/persist";

import { TitleBar }            from "@/components/simulator/TitleBar";
import { Toolbar }             from "@/components/simulator/Toolbar";
import { PatientHeader }       from "@/components/simulator/PatientHeader";
import { ScriptForm }          from "@/components/simulator/ScriptForm";
import { DrugDetailsBox }      from "@/components/simulator/DrugDetailsBox";
import { WarningsBox }         from "@/components/simulator/WarningsBox";
import { LabelPreview }        from "@/components/simulator/LabelPreview";
import { ActionButtons }       from "@/components/simulator/ActionButtons";
import { ClinicalDecisionPanel } from "@/components/simulator/ClinicalDecisionPanel";
import { StatusBar }           from "@/components/simulator/StatusBar";
import { HistoryPanel }        from "@/components/simulator/HistoryPanel";
import { ResultOverlay }       from "@/components/simulator/ResultOverlay";
import { PrescriptionDrawer }  from "@/components/simulator/PrescriptionDrawer";
import { DraggableDialogManager } from "@/components/simulator/DraggableDialogManager";
import { PatientDetailsModal } from "@/components/simulator/PatientDetailsModal";
import { DrugSelectionModal }  from "@/components/simulator/DrugSelectionModal";
import { PrescriberDirectoryModal } from "@/components/simulator/PrescriberDirectoryModal";
import { CounsellingStage }    from "@/components/simulator/CounsellingStage";
import { ExamStopwatch }       from "@/components/simulator/ExamStopwatch";
import { OnboardingModal }     from "@/components/simulator/OnboardingModal";
import type { StatusTone }     from "@/components/simulator/StatusBar";

const DEFAULT_STATUS =
  "Search for patient by surname, then enter drug details and complete the label.";
const ONBOARDING_STORAGE_KEY = "dispenserx-onboarding-v1";

export default function PracticePage() {
  const [stage, setStage]                         = useState<"dispensing" | "counselling">("dispensing");
  const [currentCaseIndex, setCurrentCaseIndex]   = useState(0);
  const [practiceMode, setPracticeMode]           = useState<PracticeMode>("practice");
  const [formState, dispatch]                      = useReducer(
    formReducer,
    STATIC_CASES[0].items.length,
    emptyFormStateFor
  );
  // One warning set and one selected product per prescribed item.
  const [selectedWarnings, setSelectedWarnings]    = useState<Set<string>[]>([new Set()]);
  const [currentItem, setCurrentItem]              = useState(0);
  const [statusMessage, setStatusMessage]          = useState(DEFAULT_STATUS);
  const [statusTone, setStatusTone]                = useState<StatusTone>("info");
  const [statusFlash, setStatusFlash]              = useState(0);
  // Every attempt gets its own variant of the case (date, authority number,
  // rotated prescriber) so repeat practice cannot rely on memorised details.
  const [attemptSeed, setAttemptSeed]              = useState(() => Date.now());
  const [onboardingOpen, setOnboardingOpen]        = useState(false);

  const [sessionScore, setSessionScore]   = useState({ correct: 0, total: 0 });
  const [pendingDispenseResult, setPendingDispenseResult] = useState<DispenseResult | null>(null);
  const [lastResult, setLastResult]       = useState<AttemptResult | null>(null);
  const [overlayOpen, setOverlayOpen]     = useState(false);
  const [initialsError, setInitialsError] = useState(false);
  const [clinicalDecision, setClinicalDecision] = useState<DispenseDecision | null>(null);
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [attemptSubmitted, setAttemptSubmitted] = useState(false);
  const [attemptResetCounter, setAttemptResetCounter] = useState(0);

  // Keep the prescription available without covering the core laptop workspace.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Patient state
  const [selectedPatient, setSelectedPatient]         = useState<Patient | null>(null);
  const [patientScripts, setPatientScripts]           = useState<PatientScript[]>([]);
  const [addPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [addPatientInitialSurname, setAddPatientInitialSurname] = useState("");

  // Drug state — one slot per prescribed item
  const [selectedDrugs, setSelectedDrugs]   = useState<(DrugRow | null)[]>([null]);
  const [drugModalOpen, setDrugModalOpen]   = useState(false);
  const [drugModalQuery, setDrugModalQuery] = useState("");

  // Prescriber state
  const [selectedPrescriber, setSelectedPrescriber] = useState<Prescriber | null>(null);
  const [prescriberModalOpen, setPrescriberModalOpen] = useState(false);
  const [prescriberModalQuery, setPrescriberModalQuery] = useState("");

  const current = useMemo(
    () => applyCaseVariant(STATIC_CASES[currentCaseIndex], attemptSeed),
    [currentCaseIndex, attemptSeed]
  );
  const currentConversation = getConversationCase(current.id);
  const editorialRecord = getCaseEditorialRecord(current.id);

  function showStatus(text: string, tone: StatusTone = "info") {
    setStatusMessage(text);
    setStatusTone(tone);
    if (tone === "error") setStatusFlash((count) => count + 1);
  }

  // First visit: open the walkthrough until the student dismisses it.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDING_STORAGE_KEY)) setOnboardingOpen(true);
    } catch {
      // Storage unavailable (private browsing) — skip auto-open.
    }
  }, []);

  function dismissOnboarding() {
    setOnboardingOpen(false);
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "seen");
    } catch {
      // Storage unavailable — the walkthrough will offer itself again next visit.
    }
  }

  // ── Reset form + patient + drug whenever the case changes ─────────
  // Reads the current attempt's variant; the handlers that change the case
  // always refresh the seed in the same render.
  useEffect(() => {
    const c = current;

    dispatch({ type: "RESET", itemCount: c.items.length });
    dispatch({ type: "SET_FIELD", field: "scriptDate",   value: c.date });
    dispatch({ type: "SET_FIELD", field: "scriptType",   value: c.scriptType });

    setSelectedWarnings(c.items.map(() => new Set()));
    setCurrentItem(0);
    setInitialsError(false);
    setStatusMessage(DEFAULT_STATUS);
    setStatusTone("info");
    setDrawerOpen(false);
    setClinicalDecision(null);
    setAnswersRevealed(false);
    setAttemptSubmitted(false);
    setOverlayOpen(false);
    setStage("dispensing");
    setPendingDispenseResult(null);
    setLastResult(null);

    setSelectedPatient(null);
    setPatientScripts([]);
    setAddPatientModalOpen(false);
    setAddPatientInitialSurname("");

    setSelectedDrugs(c.items.map(() => null));
    setDrugModalOpen(false);
    setDrugModalQuery("");

    setSelectedPrescriber(null);
    setPrescriberModalOpen(false);
    setPrescriberModalQuery("");
    // The variant (current) always changes together with the index because the
    // case-change handlers refresh the attempt seed in the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCaseIndex]);

  // ── Load patient scripts when a patient is selected ───────────────
  useEffect(() => {
    if (!selectedPatient) { setPatientScripts([]); return; }
    const supabase = createClient();
    supabase
      .from("patient_scripts")
      .select("*")
      .eq("patient_id", selectedPatient.id)
      .order("script_date", { ascending: false })
      .limit(20)
      .then(({ data }) => setPatientScripts((data as PatientScript[]) ?? []));
  }, [selectedPatient]);

  // ── Status nudge when pharmacist initials reach ≥2 chars ─────────
  useEffect(() => {
    if (formState.pharmacistInitials.trim().length >= 2) {
      showStatus("Pharmacist initials entered. Ready to dispense.");
    }
  }, [formState.pharmacistInitials]);

  // ── Handlers ──────────────────────────────────────────────────────
  function handleCaseChange(n: number) {
    setAttemptSeed(Date.now());
    setCurrentCaseIndex(n);
  }
  function handleModeChange(mode: PracticeMode) {
    setPracticeMode(mode);
    handleClear();
    showStatus(`${mode[0].toUpperCase()}${mode.slice(1)} mode selected. A fresh attempt has started.`);
  }
  function handleNext() {
    setAttemptSeed(Date.now());
    setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length);
  }
  function handleNextFromOverlay() {
    setAttemptSeed(Date.now());
    setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length);
  }

  function handleClear() {
    // A cleared attempt is a fresh attempt: derive a new variant so the script
    // details differ, and pre-fill the form from that variant.
    const seed = Date.now();
    const variant = applyCaseVariant(STATIC_CASES[currentCaseIndex], seed);
    setAttemptSeed(seed);
    setAttemptResetCounter((value) => value + 1);
    dispatch({ type: "RESET", itemCount: variant.items.length });
    dispatch({ type: "SET_FIELD", field: "scriptDate", value: variant.date });
    dispatch({ type: "SET_FIELD", field: "scriptType", value: variant.scriptType });
    setSelectedWarnings(variant.items.map(() => new Set()));
    setCurrentItem(0);
    setSelectedDrugs(variant.items.map(() => null));
    setSelectedPrescriber(null);
    setClinicalDecision(null);
    setAnswersRevealed(false);
    setAttemptSubmitted(false);
    setOverlayOpen(false);
    setStage("dispensing");
    setPendingDispenseResult(null);
    setLastResult(null);
    showStatus("Form cleared. A fresh attempt with new script details has started.");
  }

  async function handleShowAnswers() {
    dispatch({ type: "FILL_FROM_CASE", case: current });
    setSelectedWarnings(current.items.map((item) => new Set(item.correctWarnings)));
    setClinicalDecision(current.expectedDecision);
    setAnswersRevealed(true);
    showStatus(
      "Answers shown — this is now an assisted attempt and will not count in the session score."
    );

    const supabase = createClient();
    const { data: drugData } = await supabase
      .from("drugs")
      .select("*")
      .in("seed_id", current.items.map((item) => item.correctDrugSeedId));
    const { data: prescriberData } = await supabase
      .from("prescribers")
      .select("*")
      .eq("prescriber_number", current.expectedPrescriberNo ?? current.prescriberNo)
      .single();
    // Fall back to the bundled directory for anything the database is missing.
    const bySeedId = new Map(((drugData as DrugRow[]) ?? []).map((drug) => [drug.seed_id, drug]));
    setSelectedDrugs(current.items.map((item) =>
      bySeedId.get(item.correctDrugSeedId) ?? findLocalDrugBySeedId(item.correctDrugSeedId)
    ));
    setSelectedPrescriber(
      (prescriberData as Prescriber | null) ??
      findLocalPrescriberByNumber(current.expectedPrescriberNo ?? current.prescriberNo)
    );
  }

  function handleDispense() {
    if (formState.pharmacistInitials.trim().length < 2) {
      setInitialsError(true);
      showStatus("Pharmacist initials required before dispensing.", "error");
      setTimeout(() => setInitialsError(false), 3000);
      return;
    }

    const incompleteItems = getDispenseReadinessIssues({
      formState,
      selectedPatient,
      selectedDrugs,
      selectedPrescriber,
      decision: clinicalDecision,
      caseData: current,
    });

    if (incompleteItems.length > 0) {
      showStatus(
        `Cannot dispense yet — still missing: ${incompleteItems.join(", ")}.`,
        "error"
      );
      return;
    }

    const result = validateDispense({
      formState,
      selectedWarnings,
      caseData: current,
      selectedPatient,
      selectedDrugs,
      selectedPrescriber,
      decision: clinicalDecision,
      assisted: answersRevealed,
    });

    setPendingDispenseResult(result);
    setAttemptSubmitted(true);
    setDrawerOpen(false);
    showStatus("Dispensing stage submitted. Complete the patient interaction to receive your result.");
    setStage("counselling");
  }

  function handleCounsellingComplete(counsellingResult: CounsellingResult) {
    if (!pendingDispenseResult) return;

    const completeResult = combineAttemptResults(pendingDispenseResult, counsellingResult);
    const countsTowardProgress = completeResult.countsTowardProgress && practiceMode !== "learn";
    const recordedResult = { ...completeResult, countsTowardProgress };
    setLastResult(recordedResult);
    if (countsTowardProgress) {
      setSessionScore((prev) => ({
        correct: prev.correct + (completeResult.passed ? 1 : 0),
        total: prev.total + 1,
      }));
    }
    if (completeResult.assisted) {
      showStatus("Assisted dispensing and counselling review complete — not counted in the session score.");
    } else if (completeResult.passed) {
      showStatus("Complete dispensing and counselling attempt passed.", "success");
    } else {
      showStatus("Complete attempt needs review. See the combined result panel.", "error");
    }
    setOverlayOpen(true);

    void persistCompletedAttempt({
      caseId: current.id,
      caseVersion: editorialRecord.version,
      mode: practiceMode,
      result: recordedResult,
      countsTowardProgress,
    }).then((persistence) => {
      if (persistence.saved) return;
      if (persistence.reason === "schema_update_required") {
        showStatus("Attempt completed, but cloud progress needs the latest Supabase migration (0007_attempt_progress.sql). Results remain available in this session.", "error");
      } else if (persistence.reason === "database_error") {
        showStatus("Attempt completed, but cloud progress could not be saved. Results remain available in this session.", "error");
      }
    });
  }

  function handleToggleWarning(warningText: string) {
    setSelectedWarnings((prev) =>
      prev.map((set, index) => {
        if (index !== currentItem) return set;
        const next = new Set(set);
        if (next.has(warningText)) next.delete(warningText); else next.add(warningText);
        return next;
      })
    );
  }

  function handlePatientSelect(patient: Patient) { setSelectedPatient(patient); }

  function handleAddNew(surname: string) {
    setAddPatientInitialSurname(surname);
    setAddPatientModalOpen(true);
  }

  function handlePatientSaved(patient: Patient) {
    setAddPatientModalOpen(false);
    setSelectedPatient(patient);
    showStatus(`Attempt patient entered: ${patient.surname}, ${patient.firstname}`);
  }

  function handleOpenDrugModal(query: string) {
    setDrugModalQuery(query);
    setDrugModalOpen(true);
  }

  function handleDrugSelected(drug: DrugRow) {
    setSelectedDrugs((prev) => prev.map((existing, index) => (index === currentItem ? drug : existing)));
    setDrugModalOpen(false);
    dispatch({ type: "SET_ITEM_FIELD", index: currentItem, field: "drug", value: drug.full_display_name });
    showStatus(
      current.items.length > 1
        ? `Item ${currentItem + 1} product selected: ${drug.full_display_name}`
        : `Drug selected: ${drug.full_display_name}`
    );
  }

  function handleOpenPrescriberModal(query: string) {
    setPrescriberModalQuery(query.split(",")[0]?.trim() ?? query);
    setPrescriberModalOpen(true);
  }

  function handlePrescriberSelected(prescriber: Prescriber) {
    setSelectedPrescriber(prescriber);
    setPrescriberModalOpen(false);
    dispatch({ type: "SET_FIELD", field: "doctor", value: formatPrescriberName(prescriber) });
    dispatch({ type: "SET_FIELD", field: "prescriberNo", value: prescriber.prescriber_number });
    showStatus(`Prescriber selected: ${formatPrescriberName(prescriber)}`);
  }

  const patientName      = selectedPatient ? `${selectedPatient.surname}, ${selectedPatient.firstname}` : "";
  const patientAllergies = selectedPatient?.allergies ?? [];
  const scriptFormDisabled = !selectedPatient;
  const currentDrug      = selectedDrugs[currentItem] ?? null;
  const currentWarnings  = selectedWarnings[currentItem] ?? new Set<string>();
  const readinessIssues = [
    ...getDispenseReadinessIssues({
      formState,
      selectedPatient,
      selectedDrugs,
      selectedPrescriber,
      decision: clinicalDecision,
      caseData: current,
    }),
    ...(formState.pharmacistInitials.trim().length < 2 ? ["pharmacist initials"] : []),
  ];
  const hasAttemptProgress = Boolean(
    selectedPatient
    || selectedPrescriber
    || clinicalDecision
    || selectedDrugs.some(Boolean)
    || selectedWarnings.some((warnings) => warnings.size > 0)
    || formState.pharmacistInitials.trim()
    || formState.authorityNumber.trim()
    || formState.items.some((item) =>
      item.drug.trim()
      || item.directions.trim()
      || item.qty.trim()
      || item.repeats.trim()
      || item.price.trim()
    )
  );

  return (
    <>
      <DraggableDialogManager />
      <div className="fred-root">
        <div className="fred-narrow-banner">
          DispenseRx Practice is designed for laptops and desktops. For the
          best experience, switch to a larger screen.
        </div>

        <div className="fred-training-banner" role="note">
          <span>Training simulation — use current PBS, product information and jurisdictional references in practice.</span>
          <span className="fred-editorial-status">
            Case {editorialRecord.version} · pharmacist and jurisdiction review required before paid release
          </span>
        </div>

        <TitleBar />
        {practiceMode === "exam" && (
          <ExamStopwatch resetKey={`${current.id}-${attemptResetCounter}`} />
        )}
        {stage === "dispensing" ? (
          <>
            <Toolbar
              currentCase={currentCaseIndex}
              onCaseChange={handleCaseChange}
              cases={STATIC_CASES}
              sessionScore={sessionScore}
              mode={practiceMode}
              onModeChange={handleModeChange}
              onOpenHelp={() => setOnboardingOpen(true)}
            />

            <div className="fred-workspace">
          {/* ── LEFT: main content ── */}
          <div className="fred-workspace-main">
            <div className="fred-main-win">
              <PatientHeader
                caseData={current}
                selectedPatient={selectedPatient}
                onPatientSelect={handlePatientSelect}
                onAddNew={handleAddNew}
                onStatusUpdate={showStatus}
              />

              <div className="grid grid-cols-[1fr_220px] gap-1 mb-1">
                <ScriptForm
                  formState={formState}
                  dispatch={dispatch}
                  initialsError={initialsError}
                  disabled={scriptFormDisabled}
                  selectedDrugs={selectedDrugs}
                  onOpenDrugModal={handleOpenDrugModal}
                  selectedPrescriber={selectedPrescriber}
                  onOpenPrescriberModal={handleOpenPrescriberModal}
                  authorityRequirement={current.authority}
                  itemCount={current.items.length}
                  currentItem={currentItem}
                  onItemChange={setCurrentItem}
                />
                <DrugDetailsBox
                  selectedDrug={currentDrug}
                  caseItem={current.items[currentItem]}
                  patientAllergies={patientAllergies}
                />
              </div>

              <div className="grid grid-cols-[160px_1fr] gap-1 mb-1">
                <WarningsBox
                  warnings={ALL_WARNINGS}
                  selectedWarnings={currentWarnings}
                  onToggle={handleToggleWarning}
                  medicineName={currentDrug?.generic_name ?? formState.items[currentItem]?.drug ?? ""}
                />
                <LabelPreview
                  caseData={current}
                  formState={formState}
                  selectedWarnings={currentWarnings}
                  patientName={patientName}
                  itemIndex={currentItem}
                  itemCount={current.items.length}
                />
              </div>

              <div className="fred-action-dock">
                <ClinicalDecisionPanel
                  value={clinicalDecision}
                  onChange={setClinicalDecision}
                  disabled={attemptSubmitted}
                />

                <ActionButtons
                  onDispense={handleDispense}
                  onShowAnswers={handleShowAnswers}
                  onClear={handleClear}
                  onNext={handleNext}
                  decision={clinicalDecision}
                  answersRevealed={answersRevealed}
                  submitted={attemptSubmitted}
                  allowAnswerReveal={practiceMode !== "exam"}
                  readinessIssues={readinessIssues}
                  hasProgress={hasAttemptProgress}
                />
              </div>

              <StatusBar message={statusMessage} tone={statusTone} flashKey={statusFlash} />
            </div>
          </div>

          {/* ── RIGHT: sticky history panel ── */}
          <HistoryPanel
            patient={selectedPatient}
            patientScripts={patientScripts}
            onStatusUpdate={showStatus}
          />
            </div>
          </>
        ) : (
          <CounsellingStage
            key={current.id}
            conversation={currentConversation}
            decision={clinicalDecision}
            onComplete={handleCounsellingComplete}
            onViewResults={() => setOverlayOpen(true)}
            mode={practiceMode}
          />
        )}

        <OnboardingModal open={onboardingOpen} onClose={dismissOnboarding} />

        <ResultOverlay
          show={overlayOpen}
          result={lastResult}
          sessionScore={sessionScore}
          onClose={() => setOverlayOpen(false)}
          onNext={handleNextFromOverlay}
        />

        {/* Patient details modal — INSIDE .fred-root so CSS selectors match */}
        <PatientDetailsModal
          key={`${addPatientInitialSurname}-${currentCaseIndex}`}
          open={addPatientModalOpen}
          mode="add"
          initialSurname={addPatientInitialSurname}
          onSave={handlePatientSaved}
          onClose={() => setAddPatientModalOpen(false)}
        />

        {/* Drug selection modal — INSIDE .fred-root */}
        <DrugSelectionModal
          open={drugModalOpen}
          query={drugModalQuery}
          onDrugSelected={handleDrugSelected}
          onClose={() => setDrugModalOpen(false)}
        />

        <PrescriberDirectoryModal
          open={prescriberModalOpen}
          query={prescriberModalQuery}
          onSelect={handlePrescriberSelected}
          onClose={() => setPrescriberModalOpen(false)}
        />
      </div>

      {/* Prescription drawer — outside .fred-root (own CSS) */}
      <PrescriptionDrawer
        caseData={current}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        overlayOpen={overlayOpen}
      />
    </>
  );
}
