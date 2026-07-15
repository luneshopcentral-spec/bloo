"use client";

import { useEffect, useRef, useState } from "react";

interface ExamStopwatchProps {
  resetKey: string;
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ExamStopwatch({ resetKey }: ExamStopwatchProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    elapsedRef.current = 0;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  }, [resetKey]);

  useEffect(() => {
    if (!running) return;
    startedAtRef.current = Date.now() - elapsedRef.current;
    const tick = () => {
      const next = Date.now() - startedAtRef.current;
      elapsedRef.current = next;
      setElapsed(next);
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running, resetKey]);

  function reset() {
    elapsedRef.current = 0;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  }

  return (
    <div className="fred-exam-stopwatch" role="timer" aria-label="Exam attempt stopwatch">
      <span className="fred-exam-stopwatch-label">EXAM STOPWATCH</span>
      <strong aria-live="off">{formatElapsed(elapsed)}</strong>
      <button type="button" onClick={() => setRunning((value) => !value)}>
        {running ? "Pause" : "Resume"}
      </button>
      <button type="button" onClick={reset}>Reset</button>
      <span>{running ? "Timing this attempt" : "Paused"}</span>
    </div>
  );
}
