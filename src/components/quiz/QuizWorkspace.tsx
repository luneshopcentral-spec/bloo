"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  RotateCcw,
  ShieldAlert,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CONSULTATION_QUIZ_CASES, QUIZ_DOMAIN_LABELS } from "@/lib/quiz/cases";
import { scoreConsultationQuiz } from "@/lib/quiz/score";
import type { ConsultationQuizCase, QuizMode, QuizResult } from "@/lib/quiz/types";
import { QuizMedicineBook } from "./QuizMedicineBook";
import { QuizPrescription } from "./QuizPrescription";

type WorkspaceView = "library" | "question" | "results";

interface StoredQuizProgress {
  attempts: number;
  bestPercent: number;
  lastMode: QuizMode;
}

const PROGRESS_KEY = "dispenserx-consultation-quiz-progress-v1";

export function QuizWorkspace() {
  const [view, setView] = useState<WorkspaceView>("library");
  const [selectedCase, setSelectedCase] = useState<ConsultationQuizCase | null>(null);
  const [mode, setMode] = useState<QuizMode>("practice");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<QuizResult | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [progress, setProgress] = useState<Record<string, StoredQuizProgress>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PROGRESS_KEY);
      if (stored) setProgress(JSON.parse(stored) as Record<string, StoredQuizProgress>);
    } catch {
      // Progress is optional; the quiz remains fully usable without storage.
    }
  }, []);

  const closeBook = useCallback(() => setBookOpen(false), []);
  const currentQuestion = selectedCase?.questions[questionIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentChecked = currentQuestion ? checkedQuestions.has(currentQuestion.id) : false;

  const libraryTotals = useMemo(() => ({
    cases: CONSULTATION_QUIZ_CASES.length,
    questions: CONSULTATION_QUIZ_CASES.reduce((total, quizCase) => total + quizCase.questions.length, 0),
    doubleScripts: CONSULTATION_QUIZ_CASES.filter((quizCase) =>
      quizCase.prescriptions.some((script) => script.items.length > 1)
    ).length,
  }), []);

  function beginQuiz(quizCase: ConsultationQuizCase) {
    setSelectedCase(quizCase);
    setQuestionIndex(0);
    setAnswers({});
    setCheckedQuestions(new Set());
    setResult(null);
    setView("question");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function returnToLibrary() {
    setBookOpen(false);
    setView("library");
    setSelectedCase(null);
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectAnswer(optionId: string) {
    if (!currentQuestion || currentChecked) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: optionId }));
  }

  function checkPracticeAnswer() {
    if (!currentQuestion || !currentAnswer) return;
    setCheckedQuestions((current) => new Set(current).add(currentQuestion.id));
  }

  function nextQuestion() {
    if (!selectedCase || !currentQuestion || !currentAnswer) return;
    if (mode === "practice" && !currentChecked) {
      checkPracticeAnswer();
      return;
    }
    if (questionIndex < selectedCase.questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    finishQuiz();
  }

  function finishQuiz() {
    if (!selectedCase) return;
    const nextResult = scoreConsultationQuiz(selectedCase, answers);
    setResult(nextResult);
    setView("results");
    setBookOpen(false);

    const previous = progress[selectedCase.id];
    const nextProgress = {
      ...progress,
      [selectedCase.id]: {
        attempts: (previous?.attempts ?? 0) + 1,
        bestPercent: Math.max(previous?.bestPercent ?? 0, nextResult.percentage),
        lastMode: mode,
      },
    };
    setProgress(nextProgress);
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(nextProgress));
    } catch {
      // Do not block results if browser storage is unavailable.
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (view === "library") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
        <section className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
          <div className="mx-auto max-w-7xl px-8 py-10">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <BrainCircuit className="h-5 w-5" /> Consultation knowledge quizzes
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Practise the clinical reasoning behind the conversation.</h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                  Read realistic prescriptions, gather the patient factors and use the built-in medicines book to choose the single best response. These questions test application—not simple medicine-name recall.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric value={libraryTotals.cases} label="Case sets" />
                <Metric value={libraryTotals.questions} label="Questions" />
                <Metric value={libraryTotals.doubleScripts} label="Multi-item" />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-8 py-8">
          <section className="mb-7 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
            <ModeChoice
              active={mode === "practice"}
              title="Guided practice"
              description="Check each answer and read the reasoning before moving on."
              onClick={() => setMode("practice")}
            />
            <ModeChoice
              active={mode === "challenge"}
              title="Challenge mode"
              description="Answers and explanations stay hidden until the final result."
              onClick={() => setMode("challenge")}
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 md:max-w-64">
              <strong>Pass rule:</strong> 75% plus every safety-critical question. Reference use is expected in both modes.
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {CONSULTATION_QUIZ_CASES.map((quizCase, index) => {
              const saved = progress[quizCase.id];
              const itemCount = quizCase.prescriptions.reduce((total, script) => total + script.items.length, 0);
              return (
                <article key={quizCase.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">{index + 1}</span>
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={quizCase.difficulty === "Expert" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                            {quizCase.difficulty}
                          </Badge>
                          {itemCount > 1 && <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{itemCount} prescription items</Badge>}
                        </div>
                        <h2 className="text-lg font-bold text-slate-950">{quizCase.title}</h2>
                      </div>
                    </div>
                    {saved && (
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-emerald-700">{saved.bestPercent}%</div>
                        <div className="text-[11px] text-slate-500">best · {saved.attempts} attempt{saved.attempts === 1 ? "" : "s"}</div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{quizCase.subtitle}</p>
                  <div className="my-4 flex flex-wrap gap-2">
                    {quizCase.focus.map((focus) => <span key={focus} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{focus}</span>)}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {quizCase.estimatedMinutes} min</span>
                      <span>{quizCase.questions.length} questions</span>
                    </div>
                    <Button onClick={() => beginQuiz(quizCase)} className="gap-2">
                      Start {mode === "challenge" ? "challenge" : "practice"}<ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Editorial status:</strong> these are supervised-learning drafts. Every case and medicine profile must receive source-by-source review from an Australian pharmacist educator before paid public release. Current exact-product PI, PBS and jurisdictional requirements remain authoritative.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedCase) return null;

  if (view === "results" && result) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-8 py-8">
        <div className="mx-auto max-w-5xl">
          <button type="button" onClick={returnToLibrary} className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> Back to quiz library
          </button>

          <section className={`mb-6 rounded-2xl border-2 p-6 ${result.passed ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <span className={`rounded-2xl p-3 ${result.passed ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                  {result.passed ? <Trophy className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
                </span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-600">{selectedCase.title}</p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-950">{result.passed ? "Quiz passed" : "Review required"}</h1>
                  <p className="mt-1 text-sm text-slate-700">
                    {result.correct}/{result.total} correct · {result.percentage}% · Critical gate {result.criticalPassed ? "passed" : "failed"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => beginQuiz(selectedCase)} className="gap-2"><RotateCcw className="h-4 w-4" /> Retry</Button>
                <Button onClick={returnToLibrary}>Choose another case</Button>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            {result.answers.map((answer, index) => {
              const selectedOption = answer.question.options.find((option) => option.id === answer.selectedOptionId);
              const correctOption = answer.question.options.find((option) => option.id === answer.question.correctOptionId);
              return (
                <article key={answer.question.id} className={`rounded-xl border bg-white p-5 ${answer.correct ? "border-emerald-200" : "border-red-200"}`}>
                  <div className="flex items-start gap-3">
                    {answer.correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Question {index + 1}</span>
                        <Badge variant="outline">{QUIZ_DOMAIN_LABELS[answer.question.domain]}</Badge>
                        {answer.question.critical && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Safety critical</Badge>}
                      </div>
                      <h2 className="font-bold text-slate-950">{answer.question.prompt}</h2>
                      {!answer.correct && <p className="mt-3 text-sm text-red-800"><strong>Your answer:</strong> {selectedOption?.text ?? "No answer"}</p>}
                      <p className="mt-2 text-sm text-emerald-800"><strong>Best answer:</strong> {correctOption?.text}</p>
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{answer.question.explanation}</p>
                      <p className="mt-2 text-xs leading-5 text-blue-800"><strong>Reference reasoning:</strong> {answer.question.referenceNote}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const selectedIsCorrect = currentAnswer === currentQuestion.correctOptionId;
  const atLastQuestion = questionIndex === selectedCase.questions.length - 1;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={returnToLibrary} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Exit quiz">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{selectedCase.title}</p>
              <p className="text-xs text-slate-500">{mode === "practice" ? "Guided practice" : "Challenge mode"} · Question {questionIndex + 1} of {selectedCase.questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-2 w-48 overflow-hidden rounded-full bg-slate-200 sm:block">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${((questionIndex + 1) / selectedCase.questions.length) * 100}%` }} />
            </div>
            <Button variant="outline" onClick={() => setBookOpen(true)} className="gap-2 border-blue-300 text-blue-800 hover:bg-blue-50">
              <BookOpen className="h-4 w-4" /> Medicines book
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-6 py-6 lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
        <aside className="lg:sticky lg:top-[85px] lg:self-start">
          <QuizPrescription quizCase={selectedCase} />
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{QUIZ_DOMAIN_LABELS[currentQuestion.domain]}</Badge>
              {currentQuestion.critical && (
                <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700"><AlertTriangle className="h-3 w-3" /> Safety critical</Badge>
              )}
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Question {questionIndex + 1}</p>
            <h1 className="mt-2 text-xl font-bold leading-8 text-slate-950">{currentQuestion.prompt}</h1>
            <p className="mt-2 text-sm text-slate-500">Choose the single best answer. You may use the medicines book.</p>
          </div>

          <fieldset className="space-y-3 p-6" disabled={currentChecked}>
            <legend className="sr-only">Answer choices</legend>
            {currentQuestion.options.map((option, optionIndex) => {
              const selected = currentAnswer === option.id;
              const correct = currentChecked && option.id === currentQuestion.correctOptionId;
              const selectedWrong = currentChecked && selected && !correct;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                    correct
                      ? "border-emerald-400 bg-emerald-50"
                      : selectedWrong
                        ? "border-red-400 bg-red-50"
                        : selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  } ${currentChecked ? "cursor-default" : ""}`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option.id}
                    checked={selected}
                    onChange={() => selectAnswer(option.id)}
                    className="sr-only"
                  />
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="pt-0.5 text-sm leading-6 text-slate-800">{option.text}</span>
                  {correct && <Check className="ml-auto h-5 w-5 shrink-0 text-emerald-600" />}
                  {selectedWrong && <X className="ml-auto h-5 w-5 shrink-0 text-red-600" />}
                </label>
              );
            })}
          </fieldset>

          {mode === "practice" && currentChecked && (
            <div className={`mx-6 mb-6 rounded-xl border p-4 ${selectedIsCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <p className={`font-bold ${selectedIsCorrect ? "text-emerald-900" : "text-red-900"}`}>{selectedIsCorrect ? "Correct" : "Not the best answer"}</p>
              <p className="mt-1 text-sm leading-6 text-slate-800">{currentQuestion.explanation}</p>
              <p className="mt-2 text-xs leading-5 text-blue-800"><strong>Reference reasoning:</strong> {currentQuestion.referenceNote}</p>
            </div>
          )}

          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Button
              variant="outline"
              disabled={questionIndex === 0 || (mode === "practice" && currentChecked)}
              onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="hidden text-xs text-slate-500 sm:block">
              {mode === "practice" ? "Explanations are shown after checking." : "Answers stay hidden until submission."}
            </span>
            <Button disabled={!currentAnswer} onClick={nextQuestion} className="gap-2">
              {mode === "practice" && !currentChecked ? "Check answer" : atLastQuestion ? "Finish quiz" : "Next question"}
              {mode === "practice" && !currentChecked ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </footer>
        </section>
      </div>

      <QuizMedicineBook open={bookOpen} onClose={closeBook} relevantProfileIds={selectedCase.medicineProfileIds} />
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-24 rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function ModeChoice({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition ${active ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
    >
      <span className="flex items-center gap-2 font-bold text-slate-950">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
          {active && <Check className="h-3 w-3" />}
        </span>
        {title}
      </span>
      <span className="mt-1 block pl-7 text-sm text-slate-600">{description}</span>
    </button>
  );
}
