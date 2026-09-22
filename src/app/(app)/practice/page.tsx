"use client";

import { useState, useRef, useReducer, useEffect, useMemo, useCallback } from "react";
import "./simulator.css";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import type { PracticeDraft } from "@/lib/practice/draft";
import { PATIENT_SCRIPTS } from "../../../../supabase/seeds/patient-history";
import type { ConversationMessage } from "@/lib/conversation/types";

import { STATIC_CASES, ALL_WARNINGS } from "@/lib/cases/static-cases";
import { applyCaseVariant } from "@/lib/cases/variants";
import { formReducer, emptyFormStateFor } from "@/components/simulator/state";
import { directionsMatch } from "@/lib/scoring/directions";
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
import type { AttemptSubmission } from "@/lib/attempts/grade";
import { persistCompletedAttempt } from "@/lib/attempts/persist";
import { addCase1AssemblyChecks, type Case1AssemblySubmission } from "@/lib/assembly/case1";
import { canPlayCase, type CaseEntitlement } from "@/lib/entitlement/entitlement";

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
import { AssemblyStage } from "@/components/simulator/AssemblyStage";
import { LockedCasePanel }     from "@/components/simulator/LockedCasePanel";
import {
  GUIDED_TUTORIAL_STEPS,
  GuidedTutorial,
  type GuidedTutorialStep,
} from "@/components/simulator/GuidedTutorial";
import {
  guidedConversationStepComplete,
  guidedAssemblyStep,
  isGuidedTutorialStep,
} from "@/lib/practice/guided-tutorial";
import type { StatusTone }     from "@/components/simulator/StatusBar";

const FREE_CASE_COUNT = STATIC_CASES.filter((c) => c.isFree).length;

const DEFAULT_STATUS =
  "Search for patient by surname, then enter drug details and complete the label.";
const ONBOARDING_STORAGE_KEY = "dispenserx-onboarding-v1";

function normaliseTutorialEntry(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function PracticePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const sessionRef = useRef<{ key: string; promise: Promise<string | null> } | null>(null);
  const assemblyRef = useRef<Case1AssemblySubmission | null>(null);
  const [assemblyDraft, setAssemblyDraft] = useState<Case1AssemblySubmission | null>(null);
  const updateAssemblyDraft = useCallback((value: Case1AssemblySubmission) => { assemblyRef.current = value; setAssemblyDraft(value); }, []);
  const [queuedAttempt, setQueuedAttempt] = useState<AttemptSubmission | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultVerified, setResultVerified] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<PracticeDraft | null>(null);
  const [transcript, setTranscript] = useState<ConversationMessage[]>([]);
  const [initialTranscript, setInitialTranscript] = useState<ConversationMessage[]>([]);
  const countedSessions = useRef(new Set<string>());
  const [stage, setStage]                         = useState<"dispensing" | "assembly" | "counselling">("dispensing");
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
  // Keep the first server/client render deterministic so prescription details
  // hydrate identically. Every deliberate new attempt refreshes this seed.
  const [attemptSeed, setAttemptSeed]              = useState(0);
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
  const [guidedTutorialActive, setGuidedTutorialActive] = useState(false);
  const [guidedTutorialStep, setGuidedTutorialStep] = useState<GuidedTutorialStep>("welcome");

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

  // Entitlement — which cases this user may play. null until the profile loads;
  // free demo cases are playable regardless.
  const [entitlement, setEntitlement] = useState<CaseEntitlement | null>(null);

  const current = useMemo(
    () => applyCaseVariant(STATIC_CASES[currentCaseIndex], attemptSeed),
    [currentCaseIndex, attemptSeed]
  );
  const currentConversation = getConversationCase(current.id);
  const editorialRecord = getCaseEditorialRecord(current.id);
  const isCase1AssemblyPrototype = current.id === "case-1";
  const currentCaseLocked = !canPlayCase(current, entitlement);
  const activeSessionKey = JSON.stringify([current.id, attemptSeed, practiceMode]);
  const activeSessionKeyRef = useRef(activeSessionKey);
  activeSessionKeyRef.current = activeSessionKey;

  function showStatus(text: string, tone: StatusTone = "info") {
    setStatusMessage(text);
    setStatusTone(tone);
    if (tone === "error") setStatusFlash((count) => count + 1);
  }

  // First visit: open the walkthrough until the student dismisses it.
  useEffect(() => {
    try {
      if (userId && !window.localStorage.getItem(ONBOARDING_STORAGE_KEY + ":" + userId)) setOnboardingOpen(true);
    } catch {
      // Storage unavailable (private browsing) — skip auto-open.
    }
  }, [userId]);

  // Load the user's entitlement (paid / developer) once, to gate paid cases.
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      void supabase
        .from("profiles")
        .select("has_paid, role, comp_access_until")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setEntitlement((data as CaseEntitlement | null) ?? null));
    });
  }, []);

  async function ensureSession(): Promise<string | null> {
    const key = activeSessionKey;
    if (sessionRef.current?.key === key) return sessionRef.current.promise;
    const promise = fetch("/api/practice-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: current.id, seed: attemptSeed, mode: practiceMode }),
    }).then(async (response) => response.ok ? (await response.json()).id as string : null).catch(() => null);
    sessionRef.current = { key, promise };
    const id = await promise;
    // A case switch or draft restore may supersede this request while it is in flight.
    if (sessionRef.current?.promise !== promise || activeSessionKeyRef.current !== key) return null;
    setSessionId(id);
    if (!id && sessionRef.current?.key === key) sessionRef.current = null;
    return id;
  }

  useEffect(() => {
    if (!userId) return;
    try {
      const raw = localStorage.getItem("dispenserx-pending-v2:" + userId);
      if (raw) setQueuedAttempt(JSON.parse(raw));
    } catch { /* Storage is optional. */ }
  }, [userId]);

  async function saveAttempt(input: AttemptSubmission) {
    if (saving) return;
    setSaving(true);
    setQueuedAttempt(input);
    try { localStorage.setItem("dispenserx-pending-v2:" + userId, JSON.stringify(input)); } catch {}
    const persistence = await persistCompletedAttempt(input);
    setSaving(false);
    if (persistence.saved && persistence.result) {
      setResultVerified(true);
      setLastResult(persistence.result);
      if (persistence.result.countsTowardProgress && !countedSessions.current.has(input.sessionId)) {
        countedSessions.current.add(input.sessionId);
        setSessionScore((previous) => ({ total: previous.total + 1, correct: previous.correct + Number(persistence.result!.passed) }));
      }
      draft.clear();
      setQueuedAttempt(null);
      try { localStorage.removeItem("dispenserx-pending-v2:" + userId); } catch {}
      showStatus("Server-checked result saved. Review the feedback below.", persistence.result.passed ? "success" : "info");
    } else {
      setQueuedAttempt(input);
      try { localStorage.setItem("dispenserx-pending-v2:" + userId, JSON.stringify(input)); } catch {}
      showStatus(persistence.message ?? "Attempt queued. Retry saving when connected.", "error");
    }
  }

  function dismissOnboarding() {
    setOnboardingOpen(false);
    try {
      if (userId) window.localStorage.setItem(ONBOARDING_STORAGE_KEY + ":" + userId, "seen");
    } catch {
      // Storage unavailable — the walkthrough will offer itself again next visit.
    }
  }

  const advanceGuidedTutorial = useCallback(() => {
    setGuidedTutorialStep((currentStep) => {
      const index = GUIDED_TUTORIAL_STEPS.indexOf(currentStep);
      return GUIDED_TUTORIAL_STEPS[Math.min(index + 1, GUIDED_TUTORIAL_STEPS.length - 1)];
    });
  }, []);

  function startGuidedTutorial() {
    if (saving || queuedAttempt) { showStatus("Save or discard the pending result before starting the tutorial.", "error"); return; }
    if ((hasAttemptProgress || draft.candidate) && !window.confirm("Start a fresh guided case? This replaces the unfinished draft on this device. Choose Cancel to keep or resume your work.")) return;
    draft.clear();
    setDrawerOpen(false); setDrugModalOpen(false); setPrescriberModalOpen(false); setAddPatientModalOpen(false);
    dismissOnboarding();
    setGuidedTutorialActive(true);
    setGuidedTutorialStep("welcome");
    setPracticeMode("learn");
    setAttemptSeed(Date.now());
    setAttemptResetCounter((value) => value + 1);

    if (currentCaseIndex === 0) {
      handleClear();
    } else {
      setCurrentCaseIndex(0);
    }
    showStatus("Guided tutorial started. Complete each highlighted action to continue.", "success");
  }

  function exitGuidedTutorial() {
    setGuidedTutorialActive(false);
    showStatus("Guided tutorial closed. Your current case work has been kept.");
  }

  useEffect(() => {
    if (guidedTutorialActive && stage === "assembly") {
      setGuidedTutorialStep(guidedAssemblyStep(assemblyDraft, current.items[0].correctWarnings));
    }
  }, [guidedTutorialActive, stage, assemblyDraft, current.items]);

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
    setSessionId(null);
    setTranscript([]);
    setInitialTranscript([]);
    assemblyRef.current = null; setAssemblyDraft(null);

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
    let cancelled = false;
    const bundled = (PATIENT_SCRIPTS[selectedPatient.seed_id ?? ""] ?? []).map((row, index) => ({ ...row, id: "local-history-" + index, patient_id: selectedPatient.id }));
    setPatientScripts(bundled);
    // Bundled directory rows have local IDs, not database UUIDs.
    if (selectedPatient.id.startsWith("local-")) return;
    const supabase = createClient();
    supabase
      .from("patient_scripts")
      .select("*")
      .eq("patient_id", selectedPatient.id)
      .order("script_date", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = new Map([...bundled, ...((data as PatientScript[]) ?? [])].map((row) => [row.script_date + row.drug, row]));
        const dateKey = (value: string) => { const [d,m,y] = value.split("/").map(Number); return (y < 100 ? 2000 + y : y) * 10000 + m * 100 + d; };
        setPatientScripts([...rows.values()].sort((a,b) => dateKey(b.script_date) - dateKey(a.script_date)).slice(0,20));
      });
    return () => { cancelled = true; };
  }, [selectedPatient]);

  // ── Status nudge when pharmacist initials reach ≥2 chars ─────────
  useEffect(() => {
    if (formState.pharmacistInitials.trim().length >= 2) {
      showStatus("Pharmacist initials entered. Ready to dispense.");
    }
  }, [formState.pharmacistInitials]);

  // ── Handlers ──────────────────────────────────────────────────────
  function handleCaseChange(n: number) {
    if (n === currentCaseIndex) return;
    if (saving || queuedAttempt) { showStatus("Save or discard the pending attempt before leaving this case.", "error"); return; }
    if (((hasAttemptProgress && !lastResult) || draft.candidate) && !window.confirm("Change case and replace your unfinished work? Choose Cancel to keep your current case or saved draft.")) return;
    draft.clear();
    setGuidedTutorialActive(false);
    setAttemptSeed(Date.now());
    setCurrentCaseIndex(n);
  }
  function handleModeChange(mode: PracticeMode) {
    if (mode === practiceMode) return;
    if (saving || queuedAttempt) { showStatus("Save or discard the pending attempt before leaving this case.", "error"); return; }
    if (((hasAttemptProgress && !lastResult) || draft.candidate) && !window.confirm("Change mode and start a fresh attempt? Choose Cancel to keep your current work or saved draft.")) return;
    setGuidedTutorialActive(false);
    setPracticeMode(mode);
    handleClear();
    showStatus(`${mode[0].toUpperCase()}${mode.slice(1)} mode selected. A fresh attempt has started.`);
  }
  function handleNext() {
    if (saving || queuedAttempt) { showStatus("Save or discard the pending attempt before leaving this case.", "error"); return; }
    setGuidedTutorialActive(false);
    setAttemptSeed(Date.now());
    setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length);
  }
  function handleNextFromOverlay() {
    if (saving || queuedAttempt) { showStatus("Save or discard the pending attempt before leaving this case.", "error"); return; }
    setGuidedTutorialActive(false);
    setAttemptSeed(Date.now());
    setCurrentCaseIndex((i) => (i + 1) % STATIC_CASES.length);
  }

  function handleClear() {
    if (saving || queuedAttempt) { showStatus("Save or discard the pending attempt before leaving this case.", "error"); return; }
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
    setSelectedPatient(null);
    setPatientScripts([]);
    assemblyRef.current = null; setAssemblyDraft(null);
    setSelectedDrugs(variant.items.map(() => null));
    setSelectedPrescriber(null);
    setClinicalDecision(null);
    setAnswersRevealed(false);
    setAttemptSubmitted(false);
    setOverlayOpen(false);
    setStage("dispensing");
    setPendingDispenseResult(null);
    setLastResult(null);
    draft.clear();
    setSessionId(null);
    setTranscript([]);
    setInitialTranscript([]);
    showStatus("Form cleared. A fresh attempt with new script details has started.");
  }

  async function handleShowAnswers() {
    if (practiceMode === "exam") return;
    const requestedKey = activeSessionKey;
    const sessionId = await ensureSession();
    if (!sessionId) { showStatus("Cannot start a tracked session. Please retry when the practice service is available.", "error"); return; }
    const response = await fetch("/api/practice-session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) }).catch(() => null);
    if (activeSessionKeyRef.current !== requestedKey) return;
    if (!response?.ok) { showStatus("Could not record assisted mode. Please retry.", "error"); return; }
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
    if (activeSessionKeyRef.current !== requestedKey) return;
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

  async function handleDispense() {
    if (guidedTutorialActive && guidedTutorialStep !== "dispense-submit") { showStatus("Complete the current tutorial step before continuing to assembly.", "info"); return; }
    if (queuedAttempt) { showStatus("Save the pending attempt before starting another.", "error"); return; }
    if (!await ensureSession()) { showStatus("Practice tracking is unavailable. Your form is kept; retry shortly.", "error"); return; }
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

    if (isCase1AssemblyPrototype) {
      setAttemptSubmitted(true);
      setDrawerOpen(false);
      showStatus("Dispensing entry complete. Select the physical pack and apply its labels.");
      setStage("assembly");
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

  function handleAssemblyBack() {
    if (guidedTutorialActive) setGuidedTutorialStep("patient");
    setAttemptSubmitted(false);
    setStage("dispensing");
    showStatus("Pack assembly paused. Review or update the dispensing entry, then continue again.");
  }

  function handleAssemblyComplete(submission: Case1AssemblySubmission) {
    if (guidedTutorialActive && guidedTutorialStep !== "assembly-submit") { showStatus("Finish the highlighted pack checks before continuing.", "info"); return; }
    assemblyRef.current = submission;
    const assembledWarnings = current.items.map((_, index) =>
      index === 0 ? new Set(submission.warningLabels) : selectedWarnings[index] ?? new Set<string>()
    );
    const dispensingResult = validateDispense({
      formState,
      selectedWarnings: assembledWarnings,
      caseData: current,
      selectedPatient,
      selectedDrugs,
      selectedPrescriber,
      decision: clinicalDecision,
      assisted: answersRevealed,
    });
    const result = addCase1AssemblyChecks(dispensingResult, submission);

    setSelectedWarnings(assembledWarnings);
    setPendingDispenseResult(result);
    setAttemptSubmitted(true);
    setDrawerOpen(false);
    showStatus("Pack assembly submitted. Complete the patient interaction to receive your result.");
    setStage("counselling");
  }

  function handleCounsellingComplete(counsellingResult: CounsellingResult) {
    if (!pendingDispenseResult) return;
    setResultVerified(false);

    const completeResult = combineAttemptResults(pendingDispenseResult, counsellingResult);
    const countsTowardProgress = completeResult.countsTowardProgress && practiceMode !== "learn";
    const recordedResult = { ...completeResult, countsTowardProgress };
    setLastResult(recordedResult);

    if (completeResult.assisted) {
      showStatus("Assisted dispensing and counselling review complete — not counted in the session score.");
    } else if (completeResult.passed) {
      showStatus("Complete dispensing and counselling attempt passed.", "success");
    } else {
      showStatus("Complete attempt needs review. See the combined result panel.", "error");
    }
    setOverlayOpen(true);

    void ensureSession().then((sessionId) => {
      if (!sessionId) { showStatus("Result is provisional. A tracked session could not be created.", "error"); return; }
      void saveAttempt({
        sessionId, formState, selectedWarnings: selectedWarnings.map((set) => [...set]),
        drugSeedIds: selectedDrugs.map((drug) => drug?.seed_id ?? null),
        prescriberNumber: selectedPrescriber?.prescriber_number ?? null,
        patient: selectedPatient, decision: clinicalDecision, assembly: assemblyRef.current,
        transcript: counsellingResult.transcript.map(({ id, role, text }) => ({ id, role, text })),
      });
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
    setPrescriberModalOpen(false);
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
    setDrugModalOpen(false);
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

  const draft = useLocalDraft<PracticeDraft>({
    storageKey: userId ? "dispenserx-draft-v3:" + userId : null,
    enabled: (hasAttemptProgress || guidedTutorialActive) && !lastResult && !restoring,
    value: { tutorialStep: guidedTutorialActive ? guidedTutorialStep : undefined, caseIndex: currentCaseIndex, caseVersion: editorialRecord.version, seed: attemptSeed, mode: practiceMode, stage, assisted: answersRevealed, sessionId, formState, patient: selectedPatient, drugSeedIds: selectedDrugs.map((drug) => drug?.seed_id ?? null), prescriberNumber: selectedPrescriber?.prescriber_number ?? null, prescriber: selectedPrescriber, warnings: selectedWarnings.map((w) => [...w]), decision: clinicalDecision, assembly: assemblyDraft, transcript },
  });

  function resumeDraft() {
    const saved = draft.candidate;
    if (!saved || !STATIC_CASES[saved.caseIndex] || saved.caseVersion !== getCaseEditorialRecord(STATIC_CASES[saved.caseIndex].id).version || !Array.isArray(saved.formState?.items) || !Array.isArray(saved.drugSeedIds) || !Array.isArray(saved.warnings) || !Array.isArray(saved.transcript)) {
      draft.clear(); showStatus("This draft is outdated or unreadable. Please start a fresh attempt.", "error"); return;
    }
    setOnboardingOpen(false); setGuidedTutorialActive(false);
    setCurrentCaseIndex(saved.caseIndex); setAttemptSeed(saved.seed); setPracticeMode(saved.mode); setRestoring(saved); draft.clear();
  }
  useEffect(() => {
    if (!restoring) return;
    const saved = restoring;
    const c = applyCaseVariant(STATIC_CASES[saved.caseIndex], saved.seed);
    const drugs = saved.drugSeedIds.map((id) => id ? findLocalDrugBySeedId(id) : null);
    const prescriber = saved.prescriberNumber ? findLocalPrescriberByNumber(saved.prescriberNumber)
      ?? (saved.prescriber?.prescriber_number === saved.prescriberNumber ? saved.prescriber : null) : null;
    dispatch({ type: "RESTORE", state: saved.formState });
    setSelectedPatient(saved.patient); setSelectedDrugs(drugs); setSelectedPrescriber(prescriber);
    setSelectedWarnings(saved.warnings.map((w) => new Set(w))); setClinicalDecision(saved.decision); setAnswersRevealed(saved.assisted);
    assemblyRef.current = saved.assembly; setAssemblyDraft(saved.assembly); setSessionId(saved.sessionId);
    sessionRef.current = saved.sessionId ? { key: JSON.stringify([c.id, saved.seed, saved.mode]), promise: Promise.resolve(saved.sessionId) } : null;
    setTranscript(saved.transcript); setInitialTranscript(saved.transcript);
    if (saved.caseIndex === 0 && saved.mode === "learn" && isGuidedTutorialStep(saved.tutorialStep)) {
      setGuidedTutorialStep(saved.tutorialStep); setGuidedTutorialActive(true);
    }
    if (saved.stage === "counselling") {
      let result = validateDispense({ caseData: c, formState: saved.formState, selectedPatient: saved.patient, selectedDrugs: drugs, selectedPrescriber: prescriber, selectedWarnings: saved.warnings.map((w) => new Set(w)), decision: saved.decision, assisted: saved.assisted });
      if (c.id === "case-1" && saved.assembly) result = addCase1AssemblyChecks(result, saved.assembly);
      setPendingDispenseResult(result); setAttemptSubmitted(true);
    }
    setStage(saved.stage); setRestoring(null); showStatus("Draft restored on this device.", "success");
  }, [restoring]);

  useEffect(() => {
    if (!guidedTutorialActive) return;

    const item = formState.items[0];
    const expectedItem = current.items[0];
    let completed = false;

    switch (guidedTutorialStep) {
      case "prescription":
        completed = drawerOpen;
        break;
      case "patient":
        completed = selectedPatient?.seed_id === current.patientLookup.existingPatientSeedId;
        break;
      case "prescriber":
        completed = selectedPrescriber?.prescriber_number
          === (current.expectedPrescriberNo ?? current.prescriberNo);
        break;
      case "medicine":
        completed = selectedDrugs[0]?.seed_id === expectedItem.correctDrugSeedId;
        break;
      case "label-entry":
        completed = Boolean(item)
          && directionsMatch(expectedItem.directions, item.directions)
          && normaliseTutorialEntry(item.repeats) === normaliseTutorialEntry(expectedItem.repeats)
          && normaliseTutorialEntry(item.qty) === normaliseTutorialEntry(String(expectedItem.qty));
        break;
      case "initials":
        completed = formState.pharmacistInitials.trim().length >= 2;
        break;
      case "decision":
        completed = clinicalDecision === current.expectedDecision;
        break;
      case "dispense-submit":
        completed = stage === "assembly";
        break;
      case "assembly-submit":
        completed = stage === "counselling";
        break;
      case "patient-question":
      case "patient-history":
      case "patient-explanation":
      case "patient-safety-close":
      case "patient-understanding":
        completed = guidedConversationStepComplete(guidedTutorialStep, transcript);
        break;
      case "finish-consultation":
        completed = overlayOpen && Boolean(lastResult);
        break;
      default:
        break;
    }

    if (!completed) return;
    const timer = window.setTimeout(advanceGuidedTutorial, 380);
    return () => window.clearTimeout(timer);
  }, [
    clinicalDecision,
    current,
    drawerOpen,
    advanceGuidedTutorial,
    formState,
    transcript,
    guidedTutorialActive,
    guidedTutorialStep,
    lastResult,
    overlayOpen,
    selectedDrugs,
    selectedPatient,
    selectedPrescriber,
    stage,
  ]);

  return (
    <>
      <DraggableDialogManager />
      <div className="fred-root">
        <div className="fred-narrow-banner">
          DispenseRx Practice is designed for laptops and desktops. For the
          best experience, switch to a larger screen.
        </div>

        <div className="fred-training-banner" role="note">
          <span>Simulated encounter: {current.date}. Dates and history belong to this fictional case. Use current references in practice.</span>
          <span className="fred-editorial-status">
            Case {editorialRecord.version} · <a href="/account#report" target="_blank" rel="noreferrer">Report a problem</a>
          </span>
        </div>

        {queuedAttempt && <div className="fred-training-banner" role="status"><span>An attempt is waiting to save on this device.</span><button type="button" disabled={saving} onClick={() => void saveAttempt(queuedAttempt)}>{saving ? "Saving…" : "Retry save"}</button><button type="button" disabled={saving} onClick={() => { if (window.confirm("Discard this unsaved result? It will not appear in your cloud progress.")) { setQueuedAttempt(null); try { localStorage.removeItem("dispenserx-pending-v2:" + userId); } catch {} } }}>Discard unsaved result</button></div>}
        {draft.candidate && <div className="fred-training-banner" role="status"><span>{draft.candidate.tutorialStep ? "Your guided tutorial is saved. Resume at your last step." : "You have an unfinished practice session on this device."}</span><button type="button" onClick={resumeDraft}>Resume draft</button><button type="button" onClick={draft.clear}>Discard draft</button></div>}
        <TitleBar />
        {practiceMode === "exam" && (
          <ExamStopwatch resetKey={`${current.id}-${attemptResetCounter}`} />
        )}
        {currentCaseLocked ? (
          <>
            <Toolbar
              currentCase={currentCaseIndex}
              onCaseChange={handleCaseChange}
              cases={STATIC_CASES}
              sessionScore={sessionScore}
              mode={practiceMode}
              onModeChange={handleModeChange}
              onOpenHelp={() => setOnboardingOpen(true)}
              onStartGuidedTutorial={startGuidedTutorial}
              guidedTutorialActive={guidedTutorialActive}
              entitlement={entitlement}
            />
            <LockedCasePanel caseData={current} freeCaseCount={FREE_CASE_COUNT} />
          </>
        ) : stage === "dispensing" ? (
          <>
            <Toolbar
              currentCase={currentCaseIndex}
              onCaseChange={handleCaseChange}
              cases={STATIC_CASES}
              sessionScore={sessionScore}
              mode={practiceMode}
              onModeChange={handleModeChange}
              onOpenHelp={() => setOnboardingOpen(true)}
              onStartGuidedTutorial={startGuidedTutorial}
              guidedTutorialActive={guidedTutorialActive}
              entitlement={entitlement}
            />

            <div className="fred-workspace">
          {/* ── LEFT: main content ── */}
          <div className="fred-workspace-main">
            <div className="fred-main-win">
              <PatientHeader
                key={`patient-${current.id}-${attemptSeed}`}
                caseData={current}
                selectedPatient={selectedPatient}
                onPatientSelect={handlePatientSelect}
                onAddNew={handleAddNew}
                onStatusUpdate={showStatus}
              />

              <div className="grid grid-cols-[1fr_220px] gap-1 mb-1">
                <ScriptForm
                  key={`entry-${current.id}-${attemptSeed}`}
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

              <div className="fred-warnings-label-grid gap-1 mb-1">
                {isCase1AssemblyPrototype ? (
                  <div className="fred-case1-assembly-notice" role="note">
                    <span>2</span>
                    <div>
                      <strong>Warning labels move to the physical pack stage</strong>
                      <small>After completing this Fred-style entry, you will choose a carton and manually apply the dispensing and warning stickers.</small>
                    </div>
                  </div>
                ) : (
                  <WarningsBox
                    warnings={ALL_WARNINGS}
                    selectedWarnings={currentWarnings}
                    onToggle={handleToggleWarning}
                    medicineName={currentDrug?.generic_name ?? formState.items[currentItem]?.drug ?? ""}
                  />
                )}
                <LabelPreview
                  caseData={current}
                  formState={formState}
                  selectedWarnings={isCase1AssemblyPrototype ? new Set<string>() : currentWarnings}
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
                  guidedTutorial={guidedTutorialActive}
                  submitLabelOverride={isCase1AssemblyPrototype ? "Complete dispensing → Pack assembly" : undefined}
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
        ) : stage === "assembly" ? (
          <AssemblyStage
            key={`${current.id}-${attemptResetCounter}`}
            caseData={current}
            formState={formState}
            patientName={patientName}
            decision={clinicalDecision}
            initialAssembly={assemblyDraft}
            onDraftChange={updateAssemblyDraft}
            initialWarnings={currentWarnings}
            answersRevealed={answersRevealed}
            onBack={handleAssemblyBack}
            onComplete={handleAssemblyComplete}
          />
        ) : (
          <CounsellingStage
            key={current.id}
            initialTranscript={initialTranscript}
            onTranscriptChange={setTranscript}
            conversation={currentConversation}
            decision={clinicalDecision}
            onComplete={handleCounsellingComplete}
            onViewResults={() => setOverlayOpen(true)}
            mode={practiceMode}
            guidedTutorial={guidedTutorialActive}
            guidedCanFinish={!guidedTutorialActive || guidedTutorialStep === "finish-consultation" || guidedTutorialStep === "results"}
            stageLabel={isCase1AssemblyPrototype
              ? "Stage 3 of 3 · Patient consultation"
              : "Stage 2 of 2 · Patient consultation"}
          />
        )}

        <OnboardingModal open={onboardingOpen} onClose={dismissOnboarding} onStartTutorial={startGuidedTutorial} />

        <ResultOverlay
          show={overlayOpen}
          result={lastResult}
          sessionScore={sessionScore}
          onClose={() => setOverlayOpen(false)}
          onNext={handleNextFromOverlay}
          guidedTutorial={guidedTutorialActive}
          saving={saving}
          pendingSave={Boolean(queuedAttempt)}
          verified={resultVerified}
          onRetrySave={() => { if (queuedAttempt) void saveAttempt(queuedAttempt); }}
        />

        <GuidedTutorial
          active={guidedTutorialActive}
          step={guidedTutorialStep}
          transcript={transcript}
          caseData={current}
          onNext={advanceGuidedTutorial}
          onExit={exitGuidedTutorial}
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
