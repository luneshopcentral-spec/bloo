"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

/*
 * A coded, looping replica of the simulator doing real work — not a video or a
 * screenshot. Every scene renders purely from `t` (ms elapsed in the scene), so
 * it is deterministic, cheap, and trivially correct under reduced motion (we
 * just render the scene's final frame). All patient/prescriber details are
 * fictional. The visuals mirror the real simulator's palette (simulator.css).
 *
 * The replica is laid out at a fixed design size and scaled down to fit the
 * hero column (never up), so it keeps the proportions of the real window.
 */

const DESIGN_W = 820;
const DESIGN_H = 520;
const TICK = 50;

const SCENES = [
  { id: "dispense", label: "Dispense", duration: 11000, summary: "Search the patient, select the exact product, and type shorthand directions that expand into a full label, then record a clinical decision." },
  { id: "assemble", label: "Assemble", duration: 7000, summary: "Pick the correct pack from look-alike distractors and apply the dispensing and warning labels without covering the barcode or expiry." },
  { id: "counsel", label: "Counsel", duration: 10000, summary: "Counsel a simulated patient by voice or text. Marks stay hidden until you finish, like an exam." },
  { id: "feedback", label: "Feedback", duration: 7500, summary: "See a check-by-check result: which safety gates passed and which counselling points you missed." },
] as const;

const C = {
  header: "#1a3a5c",
  chrome: "#f2f5f9",
  line: "#c8d2e0",
  bg: "#e6ebf2",
  accent: "#2563eb",
  ink: "#0f172a",
  muted: "#64748b",
};

// ---------- timeline helpers ----------
function typed(text: string, t: number, start: number, cps = 16) {
  if (t < start) return "";
  return text.slice(0, Math.min(text.length, Math.floor(((t - start) / 1000) * cps)));
}
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
function Reveal({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cx("transition-all duration-500 ease-out", show ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0", className)}>
      {children}
    </div>
  );
}
function Caret({ on }: { on: boolean }) {
  return on ? <span className="demo-caret ml-px inline-block h-[14px] w-[1.5px] translate-y-[2px] bg-slate-900" /> : null;
}
function Tick({ on, tone = "ok" }: { on: boolean; tone?: "ok" | "warn" }) {
  return (
    <span
      className={cx(
        "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white transition-all duration-300",
        on ? "scale-100 opacity-100" : "scale-50 opacity-0",
        tone === "ok" ? "bg-emerald-600" : "bg-amber-500",
      )}
    >
      {tone === "ok" ? "✓" : "!"}
    </span>
  );
}
/** A checklist marker: a hollow "pending" ring that fills with a tick when done. */
function CheckMark({ on }: { on: boolean }) {
  return (
    <span className="relative inline-flex h-[18px] w-[18px] shrink-0">
      <span className="absolute inset-0 rounded-full border-2 border-slate-300" />
      <span className="absolute inset-0"><Tick on={on} /></span>
    </span>
  );
}

// ---------- shared simulator chrome ----------
const LABEL_W = 80;

function Field({ label, value, caret, done, placeholder, children }: { label: string; value: string; caret?: boolean; done?: boolean; placeholder?: string; children?: ReactNode }) {
  return (
    <div className="relative flex items-center gap-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.muted, width: LABEL_W }}>{label}</span>
      <div
        className={cx("flex h-[30px] min-w-0 flex-1 items-center justify-between gap-1 rounded-[3px] border bg-white px-2 text-[12.5px] transition-colors duration-300", done && "bg-emerald-50/60")}
        style={{ borderColor: done ? "#86c8a4" : C.line, color: C.ink }}
      >
        <span className="truncate">
          {value || <span className="text-slate-300">{placeholder}</span>}
          <Caret on={Boolean(caret)} />
        </span>
        <Tick on={Boolean(done)} />
      </div>
      {children}
    </div>
  );
}

function Dropdown({ show, rows, active }: { show: boolean; rows: string[]; active: number }) {
  return (
    <div
      className={cx(
        "absolute right-0 top-[33px] z-20 overflow-hidden rounded-[3px] border bg-white shadow-lg transition-all duration-200",
        show ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
      )}
      style={{ borderColor: C.line, left: LABEL_W + 8 }}
    >
      {rows.map((row, index) => (
        <div
          key={row}
          className="truncate px-2 py-1.5 text-[11.5px] transition-colors duration-200"
          style={{ background: index === active ? "#dbeafe" : "white", color: C.ink }}
        >
          {row}
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col overflow-hidden rounded-[4px] border bg-white", className)} style={{ borderColor: C.line }}>
      <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white" style={{ background: C.header }}>{title}</div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}

// ---------- Scene 1: dispensing entry ----------
function DispenseScene({ t }: { t: number }) {
  const patientQ = typed("MITCH", t, 300, 10);
  const patientPicked = t >= 1700;
  const prescriberDone = t >= 2000;
  const drugQ = typed("ERYTH", t, 2300, 10);
  const drugPicked = t >= 3800;
  const dirRaw = typed("1 cap qid", t, 4100, 9);
  const dirExpanded = t >= 5300;
  const qtyDone = t >= 5700;
  const decision = t >= 7000;
  const initials = typed("AG", t, 8200, 5);
  const pressed = t >= 9200;

  return (
    <div className="grid h-full grid-cols-[1.25fr_1fr] gap-3">
      <Panel title="Script entry · Item 1 of 1">
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Script type" value={t >= 600 ? "PBS General" : ""} done={t >= 600} />
            <Field label="Script date" value={t >= 600 ? "14/07/26" : ""} done={t >= 600} />
          </div>
          <Field
            label="Patient"
            value={patientPicked ? "MITCHELL, Grace" : patientQ}
            caret={!patientPicked && t >= 300}
            done={patientPicked}
            placeholder="Surname…"
          >
            <Dropdown show={t >= 850 && !patientPicked} active={t >= 1250 ? 0 : -1} rows={["MITCHELL, Grace — 12 Banksia St, Carlton", "MITCHELL, Graham — 4 Elm Rd, Brunswick"]} />
          </Field>
          <Field label="Prescriber" value={prescriberDone ? "Dr Ethan Brooks · 3719245" : ""} done={prescriberDone} placeholder="Directory…" />
          <Field
            label="Medicine"
            value={drugPicked ? "ERYTHROMYCIN (Eryc) CAP 250 MG · 25" : drugQ}
            caret={!drugPicked && t >= 2300}
            done={drugPicked}
            placeholder="Search product…"
          >
            <Dropdown
              show={t >= 2900 && !drugPicked}
              active={t >= 3350 ? 0 : -1}
              rows={["ERYTHROMYCIN (Eryc) CAP 250 MG · 25", "ERYTHROMYCIN (Eryc) CAP 500 MG · 25", "ERYTHROMYCIN ETHYLSUCC. SUSP 400 MG/5 ML"]}
            />
          </Field>
          <Field
            label="Directions"
            value={dirExpanded ? "Take ONE capsule FOUR times a day." : dirRaw}
            caret={!dirExpanded && t >= 4100}
            done={dirExpanded}
            placeholder="e.g. 1 cap qid"
          />
          <div className="h-[20px]" style={{ paddingLeft: LABEL_W + 8 }}>
            <Reveal show={dirExpanded && t < 6800} className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-blue-700">
              Shorthand expanded from “1 cap qid”
            </Reveal>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Quantity" value={qtyDone ? "25" : ""} done={qtyDone} />
            <Field label="Repeats" value={qtyDone ? "0" : ""} done={qtyDone} />
          </div>
        </div>
      </Panel>

      <div className="flex min-w-0 flex-col gap-3">
        <Panel title="Label preview">
          <div className="rounded-[3px] border border-dashed p-2.5 font-mono text-[11px] leading-[1.5]" style={{ borderColor: "#94a3b8", color: C.ink }}>
            <div className="flex justify-between text-[9.5px] text-slate-500">
              <span>DispenseRx Training Pharmacy</span>
              <span>14/07/26</span>
            </div>
            <LabelLine show={patientPicked} text="MITCHELL, Grace" bold />
            <LabelLine show={drugPicked} text="ERYTHROMYCIN (Eryc) 250 mg caps" />
            <LabelLine show={dirExpanded} text="Take ONE capsule FOUR times a day." bold />
            <LabelLine show={qtyDone} text="Qty 25  Rpt 0     Dr E Brooks" small />
          </div>
        </Panel>

        <Reveal show={t >= 6200} className="flex-1">
          <Panel title="Clinical decision" className="h-full">
            <div className="space-y-1.5">
              {["Dispense after final check", "Hold and contact prescriber", "Do not supply"].map((option, index) => {
                const selected = decision && index === 0;
                return (
                  <div
                    key={option}
                    className="flex items-center gap-2 rounded-[3px] border px-2 py-1.5 text-[12px] transition-colors duration-300"
                    style={{ borderColor: selected ? C.accent : C.line, background: selected ? "#eff6ff" : "white", color: C.ink }}
                  >
                    <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border" style={{ borderColor: selected ? C.accent : "#94a3b8" }}>
                      <span className={cx("h-[7px] w-[7px] rounded-full transition-transform duration-300", selected ? "scale-100" : "scale-0")} style={{ background: C.accent }} />
                    </span>
                    {option}
                  </div>
                );
              })}
              <div className="flex items-center gap-2 pt-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>Initials</span>
                <span className="flex h-[26px] w-[50px] items-center rounded-[3px] border bg-white px-2 text-[12.5px] font-semibold" style={{ borderColor: C.line }}>
                  {initials}<Caret on={t >= 8200 && initials.length < 2} />
                </span>
                <span
                  className={cx("ml-auto rounded-[3px] px-3 py-1.5 text-[12px] font-semibold text-white transition-all duration-200", pressed && "scale-95 ring-4 ring-blue-200")}
                  style={{ background: C.accent }}
                >
                  Dispense ▸
                </span>
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}

function LabelLine({ show, text, bold, small }: { show: boolean; text: string; bold?: boolean; small?: boolean }) {
  return (
    <div className="relative mt-1 h-[17px]">
      <div className={cx("absolute inset-y-[4px] left-0 rounded bg-slate-100 transition-opacity duration-300", show ? "opacity-0" : "opacity-100")} style={{ width: small ? "70%" : "85%" }} />
      <div className={cx("absolute inset-0 truncate transition-opacity duration-500", show ? "opacity-100" : "opacity-0", bold && "font-semibold", small && "text-[10px] text-slate-600")}>{text}</div>
    </div>
  );
}

// ---------- Scene 2: physical pack assembly ----------
const CARTON_W = 290;
const CARTON_H = 165;
const DEPTH = 24;

function AssembleScene({ t }: { t: number }) {
  const highlighted = t >= 600;
  const onBench = t >= 1300;
  const label = t >= 2200;
  const warn1 = t >= 3300;
  const warn2 = t >= 3900;
  const packs = [
    { name: "Eryc 250 mg", sub: "25 capsules", correct: true },
    { name: "Eryc 500 mg", sub: "25 capsules", correct: false },
    { name: "Erythromycin", sub: "400 mg/5 mL susp.", correct: false },
  ];

  return (
    <div className="grid h-full grid-cols-[150px_1fr_196px] gap-3">
      <Panel title="Pack shelf">
        <div className="space-y-2">
          {packs.map((pack) => {
            const moved = pack.correct && onBench;
            return (
              <div
                key={pack.name + pack.sub}
                className={cx(
                  "rounded-[4px] border px-2.5 py-2 transition-all duration-500",
                  pack.correct && highlighted && !onBench && "ring-2 ring-blue-400",
                )}
                style={{ borderColor: moved ? "#93c5fd" : C.line, background: moved ? "#eff6ff" : "#f8fafc", borderStyle: moved ? "dashed" : "solid" }}
              >
                <div className="text-[12px] font-semibold" style={{ color: moved ? C.muted : C.ink }}>{pack.name}</div>
                <div className="flex items-center justify-between text-[10.5px]" style={{ color: C.muted }}>
                  <span>{pack.sub}</span>
                  {moved && <span className="font-semibold text-blue-700">On bench</span>}
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-[10.5px] leading-snug" style={{ color: C.muted }}>Look-alike packs test strength, form and pack size.</p>
        </div>
      </Panel>

      <div className="relative flex items-center justify-center overflow-hidden rounded-[4px] border" style={{ borderColor: C.line, background: "#d9e0ea" }}>
        <span className="absolute left-3 top-2 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Dispensing bench</span>
        <div className={cx("relative mt-4 transition-all duration-700 ease-out", onBench ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}>
          {/*
            2.5D carton. Both faces hinge exactly on the front face's edges:
            the top face shares its bottom edge with the front's top edge, the
            side face shares its left edge with the front's right edge, and each
            is sheared by 45° so their far corners meet at (W + D, -D).
          */}
          <div
            className="absolute border border-slate-300 bg-[#eef2f7]"
            style={{ left: 0, top: -DEPTH, width: CARTON_W, height: DEPTH, transformOrigin: "bottom left", transform: "skewX(-45deg)" }}
          />
          <div
            className="absolute border border-slate-300 bg-[#d6dde8]"
            style={{ left: CARTON_W, top: 0, width: DEPTH, height: CARTON_H, transformOrigin: "top left", transform: "skewY(-45deg)" }}
          />
          <div className="relative border border-slate-300 bg-white p-3" style={{ width: CARTON_W, height: CARTON_H }}>
            <div className="text-[15px] font-bold" style={{ color: C.header }}>Eryc<sup className="text-[9px]">®</sup> 250</div>
            <div className="text-[10.5px]" style={{ color: C.muted }}>erythromycin 250 mg · 25 capsules</div>
            {/* barcode + expiry must stay visible */}
            <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
              <div className="flex h-[22px] items-end gap-[1.5px]">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span key={i} className="bg-slate-800" style={{ width: i % 3 === 0 ? 2.5 : 1.2, height: i % 4 === 0 ? 22 : 18 }} />
                ))}
              </div>
              <span className="text-[8.5px] text-slate-500">EXP 03/28 · BATCH 41A7</span>
            </div>
            {/* dispensing label slides on */}
            <div
              className={cx("absolute left-3 top-[50px] w-[196px] rounded-[2px] border bg-white p-1.5 font-mono text-[8.5px] leading-[1.35] shadow-md transition-all duration-700 ease-out", label ? "translate-y-0 rotate-0 opacity-100" : "translate-y-24 rotate-3 opacity-0")}
              style={{ borderColor: "#94a3b8", color: C.ink }}
            >
              <div className="font-bold">MITCHELL, Grace</div>
              <div>ERYTHROMYCIN 250 mg</div>
              <div className="font-bold">Take ONE capsule FOUR times a day.</div>
            </div>
            <div className={cx("absolute bottom-[32px] left-3 rounded-[2px] bg-amber-300 px-1.5 py-0.5 text-[8.5px] font-semibold text-amber-950 shadow transition-all duration-500", warn1 ? "scale-100 opacity-100" : "scale-75 opacity-0")}>
              Complete the full course
            </div>
            <div className={cx("absolute bottom-[10px] left-3 rounded-[2px] bg-orange-300 px-1.5 py-0.5 text-[8.5px] font-semibold text-orange-950 shadow transition-all duration-500", warn2 ? "scale-100 opacity-100" : "scale-75 opacity-0")}>
              May cause nausea
            </div>
          </div>
        </div>
      </div>

      <Panel title="Pack checks">
        <div className="space-y-2.5 text-[11.5px] leading-snug" style={{ color: C.ink }}>
          {[
            { text: "Correct strength & pack", on: onBench },
            { text: "Dispensing label applied", on: t >= 2700 },
            { text: "Barcode & expiry visible", on: t >= 3000 },
            { text: "Warning labels applied", on: t >= 4300 },
          ].map((row) => (
            <div key={row.text} className="flex items-center gap-2">
              <CheckMark on={row.on} />
              <span style={{ color: row.on ? C.ink : C.muted }}>{row.text}</span>
            </div>
          ))}
          <p className="pt-1 text-[10.5px] leading-snug" style={{ color: C.muted }}>Keyboard friendly: Enter to place, arrows to nudge, R to rotate.</p>
        </div>
      </Panel>
    </div>
  );
}

// ---------- Scene 3: patient consultation ----------
const ASK = "Nearly ready! Before I hand it over, do you have any medicine allergies?";
const COUNSEL = "Take one capsule four times a day on an empty stomach, and finish the whole course.";
const ASK_AT = 1100;
const ASK_SENT = ASK_AT + (ASK.length / 32) * 1000 + 250;
const COUNSEL_AT = 4600;
const COUNSEL_SENT = COUNSEL_AT + (COUNSEL.length / 32) * 1000 + 250;

function CounselScene({ t }: { t: number }) {
  const messages: Array<{ from: "patient" | "you"; text: string; at: number }> = [
    { from: "patient", text: "Hi — is my antibiotic ready yet?", at: 300 },
    { from: "you", text: ASK, at: ASK_SENT },
    { from: "patient", text: "No, none that I know of.", at: ASK_SENT + 700 },
    { from: "you", text: COUNSEL, at: COUNSEL_SENT },
    { from: "patient", text: "Okay — four times a day, empty stomach, finish them all.", at: COUNSEL_SENT + 800 },
  ];
  const drafting = t >= COUNSEL_AT && t < COUNSEL_SENT ? typed(COUNSEL, t, COUNSEL_AT, 32)
    : t >= ASK_AT && t < ASK_SENT ? typed(ASK, t, ASK_AT, 32) : "";
  const sentTurns = messages.filter((m) => m.from === "you" && t >= m.at).length;

  return (
    <div className="grid h-full grid-cols-[1fr_196px] gap-3">
      <div className="flex min-w-0 flex-col overflow-hidden rounded-[4px] border bg-white" style={{ borderColor: C.line }}>
        <div className="flex items-center gap-2.5 border-b px-3 py-2" style={{ borderColor: C.line }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: C.header }}>GM</span>
          <div>
            <div className="text-[12.5px] font-semibold" style={{ color: C.ink }}>Grace Mitchell</div>
            <div className="text-[10.5px]" style={{ color: C.muted }}>Stage 3 · Patient consultation</div>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 py-2.5">
          {messages.filter((m) => t >= m.at).map((m) => (
            <div key={m.text} className={cx("demo-pop max-w-[80%] rounded-[10px] px-3 py-1.5 text-[12px] leading-snug", m.from === "you" ? "self-end" : "self-start")}
              style={{ background: m.from === "you" ? "#dbeafe" : "#f1f5f9", color: C.ink }}>
              <span className="mb-0.5 block text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>{m.from === "you" ? "You" : "Grace"}</span>
              {m.text}
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 border-t p-2" style={{ borderColor: C.line }}>
          {/* Wraps like a real composer, so long drafts never overflow. */}
          <div className="flex min-h-[34px] flex-1 items-center rounded-[4px] border px-2 py-1.5 text-[12px] leading-snug" style={{ borderColor: C.line, color: C.ink }}>
            <span>{drafting ? <>{drafting}<Caret on /></> : <span className="text-slate-300">Speak or type to the patient…</span>}</span>
          </div>
          <span className="rounded-[3px] px-3 py-2 text-[11.5px] font-semibold text-white" style={{ background: C.accent }}>Send</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Panel title="Consultation">
          <div className="space-y-2 text-[11.5px] leading-snug" style={{ color: C.ink }}>
            <div className="flex gap-1.5">
              <span className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium" style={{ borderColor: C.line }}>🎙 Voice</span>
              <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10.5px] font-medium text-blue-700">⌨ Text</span>
            </div>
            <p style={{ color: C.muted }}>Communicate as you would in an exam. Marks stay hidden until you finish.</p>
            <p className="font-semibold tabular-nums">{sentTurns} / 60 responses</p>
          </div>
        </Panel>
        <Panel title="Patient record" className="flex-1">
          <div className="space-y-1 text-[11.5px]" style={{ color: C.ink }}>
            <div><span style={{ color: C.muted }}>DOB</span> 03/05/1994</div>
            <div><span style={{ color: C.muted }}>Allergies</span> Nil known</div>
            <div><span style={{ color: C.muted }}>Script</span> Erythromycin 250 mg</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Scene 4: check-by-check feedback ----------
function FeedbackScene({ t }: { t: number }) {
  const score = Math.min(20, Math.floor((t / 1400) * 20));
  const dispensing = ["Patient selected", "Prescriber verified", "Exact product", "Directions", "Quantity & repeats", "Pack & labels"];
  const counselling = [
    { text: "Identity & allergies checked", ok: true },
    { text: "Directions explained", ok: true },
    { text: "Empty-stomach advice", ok: true },
    { text: "Complete the course", ok: true },
    { text: "Teach-back not requested", ok: false },
  ];
  const startAt = 1800;
  const step = 300;

  return (
    <div className="flex h-full items-start justify-center">
      <div className="w-full overflow-hidden rounded-[4px] border bg-white shadow-xl" style={{ borderColor: C.line }}>
        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: C.header }}>
          <span>Complete attempt results</span>
          <span className="opacity-70">✕</span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4">
            <div className="text-[34px] font-bold tabular-nums leading-none" style={{ color: C.ink }}>
              {score}<span className="text-[20px] text-slate-400">/22</span>
            </div>
            <Reveal show={t >= 1500} className="flex-1">
              <div className="flex items-center gap-2 rounded-[4px] border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12.5px] font-semibold text-emerald-800">
                <Tick on /> All critical safety gates passed
              </div>
            </Reveal>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Dispensing & pack · 12/12</div>
              <div className="space-y-1.5">
                {dispensing.map((row, i) => (
                  <Reveal key={row} show={t >= startAt + i * step}>
                    <div className="flex items-center gap-2 rounded-[3px] bg-emerald-50/70 px-2 py-1 text-[12px]" style={{ color: C.ink }}><Tick on={t >= startAt + i * step} />{row}</div>
                  </Reveal>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Consultation · 8/10</div>
              <div className="space-y-1.5">
                {counselling.map((row, i) => {
                  const on = t >= startAt + (dispensing.length + i) * step;
                  return (
                    <Reveal key={row.text} show={on}>
                      <div className={cx("flex items-center gap-2 rounded-[3px] px-2 py-1 text-[12px]", row.ok ? "bg-emerald-50/70" : "bg-amber-50")} style={{ color: C.ink }}>
                        <Tick on={on} tone={row.ok ? "ok" : "warn"} />{row.text}
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
          <Reveal show={t >= 5400} className="mt-4">
            <div className="rounded-[4px] border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-900">
              <strong>Pharmacist tip:</strong> ask the patient to explain the plan back in their own words before they leave.
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

const STAGE_TITLES: Record<(typeof SCENES)[number]["id"], string> = {
  dispense: "Stage 1 · Dispensing",
  assemble: "Stage 2 · Pack assembly",
  counsel: "Stage 3 · Patient consultation",
  feedback: "Results",
};
const STATUS: Record<(typeof SCENES)[number]["id"], Array<[number, string]>> = {
  dispense: [[0, "Search for patient by surname, then enter drug details and complete the label."], [1700, "Patient selected. Check the address and Medicare details."], [3800, "Product selected — confirm strength, form and pack size."], [5300, "Directions expanded from shorthand."], [7000, "Clinical decision recorded."], [9300, "✓ Dispensing entry complete. Continue to pack assembly."]],
  assemble: [[0, "Select the physical pack that matches the dispensing entry."], [1300, "Pack on the bench. Apply the dispensing label."], [2700, "Label placed clear of the barcode and expiry. Apply the warning labels."], [4300, "✓ Pack assembly complete. Hand over to the patient."]],
  counsel: [[0, "Consultation in progress."], [COUNSEL_SENT + 800, "Finish the consultation when you are ready for feedback."]],
  feedback: [[0, "Result saved and checked."]],
};

// ---------- shell: tabs, scaling, playback ----------
export function HeroDemo() {
  const [scene, setScene] = useState(0);
  const [t, setT] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [scale, setScale] = useState(0.75);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Plays continuously while on screen; only an explicit pause (or being
  // scrolled away, or reduced-motion preference) stops it. Hover does not.
  const playing = visible && !paused && !reduced;
  const current = SCENES[scene];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    // Scale down to fit the column, never up past the design size.
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / DESIGN_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setT((prev) => prev + TICK), TICK);
    return () => window.clearInterval(id);
  }, [playing]);

  // Advance to the next scene once this one has played out (kept out of the
  // state updater so Strict Mode's double-invoked updaters can't skip scenes).
  useEffect(() => {
    if (t < SCENES[scene].duration) return;
    setScene((s) => (s + 1) % SCENES.length);
    setT(0);
  }, [t, scene]);

  // Reduced motion: show each scene's completed state rather than animating it.
  const frameT = reduced ? current.duration : t;
  const status = [...STATUS[current.id]].reverse().find(([at]) => frameT >= at)?.[1] ?? "";

  return (
    <div
      ref={stageRef}
      className="w-full min-w-0 rounded-[24px] bg-slate-100 p-2"
      aria-label="Walkthrough of the DispenseRx simulator"
      role="region"
    >
      <div className="flex items-center gap-1">
        <div role="tablist" aria-label="Simulator stages" className="grid flex-1 grid-cols-4 gap-1 p-0.5">
          {SCENES.map((s, index) => {
            const active = index === scene;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="hero-demo-panel"
                onClick={() => { setScene(index); setT(0); }}
                className={cx(
                  "relative overflow-hidden rounded-[14px] px-1 py-2 text-center text-[12.5px] font-medium transition sm:text-sm",
                  active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <span className="mr-1 hidden text-slate-400 sm:inline">{index + 1}</span>
                {s.label}
                {active && !reduced && (
                  <span className="absolute inset-x-3 bottom-1 h-[2px] overflow-hidden rounded-full bg-slate-200">
                    <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, (t / s.duration) * 100)}%` }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play walkthrough" : "Pause walkthrough"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-900"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <div
        id="hero-demo-panel"
        role="tabpanel"
        className="mt-1.5 rounded-[18px] bg-[#0d1110] p-2.5 sm:p-4"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      >
        <p className="sr-only">{current.summary}</p>
        <div ref={frameRef} className="relative mx-auto w-full overflow-hidden" style={{ maxWidth: DESIGN_W, height: DESIGN_H * scale }} aria-hidden="true">
          <div
            className="absolute left-0 top-0 flex flex-col overflow-hidden rounded-[8px] shadow-2xl"
            style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: "top left", background: C.bg }}
          >
            <div className="flex h-7 shrink-0 items-center justify-between px-3 text-[12px] text-white" style={{ background: C.header }}>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-[2px] bg-sky-300/80" />DispenseRx Practice — dispensing simulator</span>
              <span className="opacity-70">Case 1 · Erythromycin · Practice</span>
            </div>
            <div className="flex h-8 shrink-0 items-center gap-2 border-b-2 px-3 text-[11.5px]" style={{ background: C.chrome, borderColor: C.line, color: "#334155" }}>
              <span className="font-semibold" style={{ color: C.header }}>{STAGE_TITLES[current.id]}</span>
              <span className="ml-auto flex gap-1.5">
                {["Patient F2", "Drug F3", "Directory", "Prescription"].map((b) => (
                  <span key={b} className="rounded-[3px] border bg-white px-2 py-0.5 text-[10.5px]" style={{ borderColor: C.line }}>{b}</span>
                ))}
              </span>
            </div>
            <div key={current.id} className="demo-scene min-h-0 flex-1 p-3">
              {current.id === "dispense" && <DispenseScene t={frameT} />}
              {current.id === "assemble" && <AssembleScene t={frameT} />}
              {current.id === "counsel" && <CounselScene t={frameT} />}
              {current.id === "feedback" && <FeedbackScene t={frameT} />}
            </div>
            <div className="flex h-6 shrink-0 items-center justify-between gap-3 border-t-2 px-3 text-[11px]" style={{ background: C.chrome, borderColor: C.line, color: "#334155" }}>
              <span className="truncate">{status}</span>
              <span className="tabular-nums opacity-70">10:42</span>
            </div>
          </div>
        </div>
      </div>
      <p className="px-2 pb-0.5 pt-2 text-center text-[11px] text-slate-500">
        Illustrative walkthrough · fictional patient and prescriber
      </p>
    </div>
  );
}
