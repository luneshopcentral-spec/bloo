"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Loader2, X } from "lucide-react";

type Kind = "bug" | "content" | "other";

const KINDS: Array<{ value: Kind; label: string }> = [
  { value: "bug", label: "Something's broken" },
  { value: "content", label: "Clinical content" },
  { value: "other", label: "Other" },
];

/**
 * Report control lives in the title bar, so it cannot cover simulator actions.
 * Its dialog still overlays the workspace when deliberately opened.
 */
export function SimulatorFeedback({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 40);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setStatus({ ok: false, text: "Please add a little more detail (at least 10 characters)." });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, caseId, message: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setStatus({ ok: true, text: "Thanks — your report was sent to the team." });
        setMessage("");
      } else {
        setStatus({ ok: false, text: (data as { error?: string }).error ?? "Could not send. Please try again." });
      }
    } catch {
      setStatus({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setStatus(null); }}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        Report a problem
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[700] flex items-end justify-start bg-black/30 p-4 sm:p-6"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report a problem"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Report a problem</h2>
                <p className="mt-0.5 text-xs text-slate-500">Case {caseId}. Use fictional patient details only.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="mb-3 flex flex-wrap gap-1">
                {KINDS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={kind === option.value}
                    onClick={() => setKind(option.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${kind === option.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <label htmlFor="sim-feedback-message" className="sr-only">Describe the problem</label>
              <textarea
                id="sim-feedback-message"
                ref={textareaRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={4000}
                rows={4}
                placeholder="What went wrong? Include the case, what you did, what you expected, and what happened."
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              />

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {busy ? "Sending…" : "Send report"}
                </button>
                {status && (
                  <span role="status" className={`text-sm ${status.ok ? "text-emerald-700" : "text-red-600"}`}>{status.text}</span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
