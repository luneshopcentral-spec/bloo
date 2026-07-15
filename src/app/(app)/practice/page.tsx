"use client";

import { useState, useReducer, useEffect } from "react";
import "./simulator.css";

import { STATIC_CASES, ALL_WARNINGS } from "@/lib/cases/static-cases";
import { formReducer, EMPTY_FORM_STATE } from "@/components/simulator/state";
import { validateDispense } from "@/lib/scoring/validate";
import { getDispenseReadinessIssues } from "@/lib/scoring/readiness";
import type { DispenseResult } from "@/lib/scoring/types";
import type { AttemptResult, CounsellingResult } from "@/lib/conversation/types";
import { combineAttemptResults } from "@/lib/conversation/score";
import { getConversationCase } from "@/lib/conversation/cases";
import type { DispenseDecision, MessageRow } from "@/lib/types/case";
import type { Patient, PatientScript } from "@/lib/types/patient";
import type { DrugRow } from "@/lib/types/drug";
import type { Prescriber } from "@/lib/types/prescriber";
import { formatPrescriberName } from "@/lib/types/prescriber";
import { createClient } from "@/lib/supabase/client";
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
import { ApiBox }              from "@/components/simulator/ApiBox";
import { ActionButtons }       from "@/components/simulator/ActionButtons";
import { ClinicalDecisionPanel } from "@/components/simulator/ClinicalDecisionPanel";
import { MessagesPanel }       from "@/components/simulator/MessagesPanel";
import { StatusBar }           from "@/components/simulator/StatusBar";
import { HistoryPanel }        from "@/components/simulator/HistoryPanel";
import { ResultOverlay }       from "@/components/simulator/ResultOverlay";
import { PrescriptionDrawer }  from "@/components/simulator/PrescriptionDrawer";
import { PatientDetailsModal } from "@/components/simulator/PatientDetailsModal";
import { DrugSelectionModal }  from "@/components/simulator/DrugSelectionModal";
import { PrescriberDirectoryModal } from "@/components/simulator/PrescriberDirectoryModal";
import { CounsellingStage }    from "@/components/simulator/CounsellingStage";
import { ExamStopwatch }       from "@/components/simulator/ExamStopwatch";

const DEFAULT_STATUS =
  "Search for patient by surname, then enter drug details and complete the label.";

export default function PracticePage() {
  const [stage, setStage]                         = useState<"dispensing" | "counselling">("dispensing");
  const [currentCaseIndex, setCurrentCaseIndex]   = useState(0);
  const [practiceMode, setPracticeMode]           = useState<PracticeMode>("practice");
  const [formState, dispatch]                      = useReducer(formReducer, EMPTY_FORM_STATE);
  const [selectedWarnings, setSelectedWarnings]    = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage]          = useState(DEFAULT_STATUS);
  const [messages, setMessages]                    = useState<MessageRow[]>([]);

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

  // Drug state
  const [selectedDrug, setSelectedDrug]     = useState<DrugRow | null>(null);
  const [drugModalOpen, setDrugModalOpen]   = useState(false);
  const [drugModalQuery, setDrugModalQuery] = useState("");

  // Prescriber state
  const [selectedPrescriber, setSelectedPrescriber] = useState<Prescriber | null>(null);
  const [prescriberModalOpen, setPrescriberModalOpen] = useState(false);
  const [prescriberModalQuery, setPrescriberModalQuery] = useState("");

  const current = STATIC_CASES[currentCaseIndex];
  const currentConversation = getConversationCase(current.id);
  const editorialRecord = getCaseEditorialRecord(current.id);

  // ── Reset form + patient + drug whenever the case changes ─────────
  useEffect(() => {
    const c = STATIC_CASES[currentCaseIndex];

    dispatch({ type: "RESET" });
    dispatch({ type: "SET_FIELD", field: "scriptDate",   value: c.date });
    dispatch({ type: "SET_FIELD", field: "scriptType",   value: c.scriptType });

    setSelectedWarnings(new Set());
    setInitialsError(false);
    setStatusMessage(DEFAULT_STATUS);
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

    setSelectedDrug(null);
    setDrugModalOpen(false);
    setDrugModalQuery("");

    setSelectedPrescriber(null);
    setPrescriberModalOpen(false);
    setPrescriberModalQuery("");

    // Do not reveal the case's hidden clinical issue before the student decides.
    setMessages([]);
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
      setStatusMessage("Pharmacist initials entered. Ready to dispense.");
    }
  }, [formState.pharmacistInitials]);

  // ── Handlers ──────────────────────────────────────────────────────
  function handleCaseChange(n: number) { setCurrentCaseIndex(n); }
  function handleModeChange(mode: PracticeMode) {
    setPracticeMode(mode);
    handleClear();
    setStatusMessage(`${mode[0].toUpperCase()}${mode.slice(1)} mode selected. A fresh attempt has started.`);
  }
  function handleNext() { setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length); }
  function handleNextFromOverlay() { setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length); }

  function handleClear() {
    setAttemptResetCounter((value) => value + 1);
    dispatch({ type: "RESET" });
    setSelectedWarnings(new Set());
    setSelectedDrug(null);
    setSelectedPrescriber(null);
    setClinicalDecision(null);
    setAnswersRevealed(false);
    setAttemptSubmitted(false);
    setOverlayOpen(false);
    setStage("dispensing");
    setPendingDispenseResult(null);
    setLastResult(null);
    setStatusMessage("Form cleared. Enter the next script.");
    setMessages([]);
  }

  async function handleShowAnswers() {
    dispatch({ type: "FILL_FROM_CASE", case: current });
    setSelectedWarnings(new Set(current.correctWarnings));
    setClinicalDecision(current.expectedDecision);
    setAnswersRevealed(true);
    setStatusMessage(
      "Answers shown — this is now an assisted attempt and will not count in the session score."
    );

    const supabase = createClient();
    const { data: drugData } = await supabase
      .from("drugs")
      .select("*")
      .eq("seed_id", current.correctDrugSeedId)
      .single();
    const { data: prescriberData } = await supabase
      .from("prescribers")
      .select("*")
      .eq("prescriber_number", current.expectedPrescriberNo ?? current.prescriberNo)
      .single();
    if (drugData) setSelectedDrug(drugData as DrugRow);
    if (prescriberData) setSelectedPrescriber(prescriberData as Prescriber);
  }

  function handleDispense() {
    if (formState.pharmacistInitials.trim().length < 2) {
      setInitialsError(true);
      setStatusMessage("⚠ Pharmacist initials required before dispensing.");
      setTimeout(() => setInitialsError(false), 3000);
      return;
    }

    const incompleteItems = getDispenseReadinessIssues({
      formState,
      selectedPatient,
      selectedDrug,
      selectedPrescriber,
      decision: clinicalDecision,
      caseData: current,
    });

    if (incompleteItems.length > 0) {
      setStatusMessage(
        `Complete the dispensing workflow before handover: ${incompleteItems.join(", ")}.`
      );
      return;
    }

    const result = validateDispense({
      formState,
      selectedWarnings,
      caseData: STATIC_CASES[currentCaseIndex],
      selectedPatient,
      selectedDrug,
      selectedPrescriber,
      decision: clinicalDecision,
      assisted: answersRevealed,
    });

    setPendingDispenseResult(result);
    setAttemptSubmitted(true);
    setDrawerOpen(false);
    setStatusMessage("Dispensing stage submitted. Complete the patient interaction to receive your result.");
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
    setStatusMessage(
      completeResult.assisted
        ? "Assisted dispensing and counselling review complete — not counted in the session score."
        : completeResult.passed
          ? "Complete dispensing and counselling attempt passed."
          : "Complete attempt needs review. See the combined result panel."
    );
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
        setStatusMessage("Attempt completed, but cloud progress needs the latest Supabase migration (0007_attempt_progress.sql). Results remain available in this session.");
      } else if (persistence.reason === "database_error") {
        setStatusMessage("Attempt completed, but cloud progress could not be saved. Results remain available in this session.");
      }
    });
  }

  function handleToggleWarning(warningText: string) {
    setSelectedWarnings((prev) => {
      const next = new Set(prev);
      if (next.has(warningText)) next.delete(warningText); else next.add(warningText);
      return next;
    });
  }

  function handlePatientSelect(patient: Patient) { setSelectedPatient(patient); }

  function handleAddNew(surname: string) {
    setAddPatientInitialSurname(surname);
    setAddPatientModalOpen(true);
  }

  function handlePatientSaved(patient: Patient) {
    setAddPatientModalOpen(false);
    setSelectedPatient(patient);
    setStatusMessage(`Attempt patient entered: ${patient.surname}, ${patient.firstname}`);
  }

  function handleOpenDrugModal(query: string) {
    setDrugModalQuery(query);
    setDrugModalOpen(true);
  }

  function handleDrugSelected(drug: DrugRow) {
    setSelectedDrug(drug);
    setDrugModalOpen(false);
    dispatch({ type: "SET_FIELD", field: "drug", value: drug.full_display_name });
    setStatusMessage(`Drug selected: ${drug.full_display_name}`);
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
    setStatusMessage(`Prescriber selected: ${formatPrescriberName(prescriber)}`);
  }

  const patientName      = selectedPatient ? `${selectedPatient.surname}, ${selectedPatient.firstname}` : "";
  const patientAllergies = selectedPatient?.allergies ?? [];
  const scriptFormDisabled = !selectedPatient;

  return (
    <>
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
                onStatusUpdate={setStatusMessage}
              />

              <div className="grid grid-cols-[1fr_220px] gap-1 mb-1">
                <ScriptForm
                  formState={formState}
                  dispatch={dispatch}
                  initialsError={initialsError}
                  disabled={scriptFormDisabled}
                  selectedDrug={selectedDrug}
                  onOpenDrugModal={handleOpenDrugModal}
                  selectedPrescriber={selectedPrescriber}
                  onOpenPrescriberModal={handleOpenPrescriberModal}
                  authorityRequirement={current.authority}
                />
                <DrugDetailsBox
                  selectedDrug={selectedDrug}
                  caseData={current}
                  patientAllergies={patientAllergies}
                />
              </div>

              <div className="grid grid-cols-[160px_1fr_100px] gap-1 mb-1">
                <WarningsBox
                  warnings={ALL_WARNINGS}
                  selectedWarnings={selectedWarnings}
                  onToggle={handleToggleWarning}
                  medicineName={selectedDrug?.generic_name ?? formState.drug}
                />
                <LabelPreview
                  caseData={current}
                  formState={formState}
                  selectedWarnings={selectedWarnings}
                  patientName={patientName}
                />
                <ApiBox />
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
                />
              </div>

              <MessagesPanel messages={messages} />
              <StatusBar message={statusMessage} />
            </div>
          </div>

          {/* ── RIGHT: sticky history panel ── */}
          <HistoryPanel
            patient={selectedPatient}
            patientScripts={patientScripts}
            onStatusUpdate={setStatusMessage}
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
