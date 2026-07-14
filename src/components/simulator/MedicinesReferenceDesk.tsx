"use client";

import { useEffect, useRef, useState } from "react";

interface MedicinesReferenceDeskProps {
  medicineName: string;
}

export function MedicinesReferenceDesk({ medicineName }: MedicinesReferenceDeskProps) {
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const query = medicineName.trim();

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      trigger?.focus();
    };
  }, [open]);

  async function copyMedicineName() {
    if (!query) return;
    try {
      await navigator.clipboard.writeText(query);
      setCopyStatus("Medicine name copied");
    } catch {
      setCopyStatus("Copy unavailable—select the medicine name and copy it manually");
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="fred-reference-open"
        onClick={() => {
          setCopyStatus("");
          setOpen(true);
        }}
      >
        Open exam references
      </button>

      {open && (
        <div
          className="fred-reference-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="fred-reference-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="medicines-reference-title"
          >
            <header className="fred-reference-titlebar">
              <h2 id="medicines-reference-title">Permitted medicines reference desk</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close medicines reference desk"
              >
                ×
              </button>
            </header>

            <div className="fred-reference-body">
              <p className="fred-reference-lead">
                Use the same licensed university or exam references you would use in an assessment.
                The simulator never receives your login or copies subscription content.
              </p>

              <label htmlFor="reference-medicine-name">Medicine to look up</label>
              <div className="fred-reference-query-row">
                <input
                  id="reference-medicine-name"
                  value={query || "Select a medicine product first"}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" onClick={() => void copyMedicineName()} disabled={!query}>
                  Copy name
                </button>
              </div>
              {copyStatus && <div className="fred-reference-copy-status" role="status">{copyStatus}</div>}

              <div className="fred-reference-links">
                <a href="https://amhonline.amh.net.au/auth" target="_blank" rel="noreferrer">
                  Open AMH Online <span aria-hidden="true">↗</span>
                </a>
                <a href="https://apf.psa.org.au/" target="_blank" rel="noreferrer">
                  Open APF Digital <span aria-hidden="true">↗</span>
                </a>
              </div>

              <div className="fred-reference-guidance">
                <strong>Which reference?</strong>
                <p>
                  Use AMH for medicine-specific clinical and counselling review. Use the current APF
                  Cautionary Advisory Label recommendations when deciding which warning labels apply.
                </p>
              </div>

              <p className="fred-reference-footnote">
                Opening an exam-permitted reference does not reveal this case&apos;s answer key and does not
                make the attempt assisted. Follow the reference access rules set by your course or exam.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
