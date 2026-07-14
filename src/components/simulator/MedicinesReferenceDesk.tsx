"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PUBLIC_MEDICINE_REFERENCES,
  searchMedicineLearningProfiles,
} from "@/lib/medicines-learning/reference";

interface MedicinesReferenceDeskProps {
  medicineName: string;
}

export function MedicinesReferenceDesk({ medicineName }: MedicinesReferenceDeskProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const queryFromSelection = medicineName.trim();
  const results = useMemo(() => searchMedicineLearningProfiles(query), [query]);
  const activeProfile =
    results.find((profile) => profile.id === selectedProfileId) ?? results[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    setQuery(queryFromSelection);
    setSelectedProfileId(null);
    setCopyStatus("");
    requestAnimationFrame(() => searchRef.current?.focus());

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      trigger?.focus();
    };
  }, [open, queryFromSelection]);

  async function copySearchName() {
    if (!query.trim()) return;
    try {
      await navigator.clipboard.writeText(query.trim());
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
        onClick={() => setOpen(true)}
      >
        Open medicines reference
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
              <div>
                <h2 id="medicines-reference-title">Australian medicines learning portal</h2>
                <span>Structured study profiles · exact-product checks · public Australian sources</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close medicines reference"
              >
                ×
              </button>
            </header>

            <div className="fred-reference-searchbar">
              <label htmlFor="reference-medicine-search">Medicine or class</label>
              <input
                ref={searchRef}
                id="reference-medicine-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedProfileId(null);
                  setCopyStatus("");
                }}
                placeholder="Search erythromycin, warfarin, antibiotic…"
                autoComplete="off"
              />
              <button type="button" onClick={() => void copySearchName()} disabled={!query.trim()}>
                Copy search name
              </button>
              <span role="status">{copyStatus}</span>
            </div>

            <div className="fred-reference-workspace">
              <nav className="fred-reference-results" aria-label="Medicine learning profiles">
                <div className="fred-reference-pane-title">
                  {results.length} learning profile{results.length === 1 ? "" : "s"}
                </div>
                {results.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    className={activeProfile?.id === profile.id ? "selected" : ""}
                    onClick={() => setSelectedProfileId(profile.id)}
                  >
                    <strong>{profile.genericName}</strong>
                    <span>{profile.medicineClass}</span>
                  </button>
                ))}
                {results.length === 0 && (
                  <p>
                    No internal profile yet. Use the public sources on the right and ask an educator
                    to add and review this medicine.
                  </p>
                )}
              </nav>

              <article className="fred-reference-profile">
                {activeProfile ? (
                  <>
                    <div className="fred-reference-profile-heading">
                      <div>
                        <h3>{activeProfile.genericName}</h3>
                        <span>{activeProfile.medicineClass}</span>
                      </div>
                      <span className="fred-reference-review-badge">Pharmacist review required</span>
                    </div>
                    <p className="fred-reference-summary">{activeProfile.summary}</p>

                    <dl className="fred-reference-quick-facts">
                      {activeProfile.quickFacts.map((fact) => (
                        <div key={fact.label}>
                          <dt>{fact.label}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <nav className="fred-reference-section-nav" aria-label={`${activeProfile.genericName} sections`}>
                      {activeProfile.sections.map((section) => (
                        <a key={section.id} href={`#medicine-${activeProfile.id}-${section.id}`}>
                          {section.heading}
                        </a>
                      ))}
                      <a href={`#medicine-${activeProfile.id}-products`}>Products</a>
                      <a href={`#medicine-${activeProfile.id}-sources`}>References</a>
                    </nav>

                    <div className="fred-reference-sections">
                      {activeProfile.sections.map((section) => (
                        <section key={section.id} id={`medicine-${activeProfile.id}-${section.id}`}>
                          <h4>{section.heading}</h4>
                          <p>{section.summary}</p>
                          <ul>
                            {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                          </ul>
                        </section>
                      ))}
                    </div>

                    <section
                      className="fred-reference-products"
                      id={`medicine-${activeProfile.id}-products`}
                    >
                      <h4>Products and formulation checks</h4>
                      <table>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Form / strength</th>
                            <th>Learning note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeProfile.products.map((product) => (
                            <tr key={`${product.product}-${product.formAndStrength}`}>
                              <td>{product.product}</td>
                              <td>{product.formAndStrength}</td>
                              <td>{product.learningNote}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>

                    <section className="fred-reference-reasoning">
                      <h4>Derive the labels—do not copy an answer</h4>
                      <p>Use the exact product information to answer these questions, then write the applicable labels in the dispensing screen.</p>
                      <ul>
                        {activeProfile.labelReasoningClues.map((clue) => <li key={clue}>{clue}</li>)}
                      </ul>
                    </section>

                    <section
                      className="fred-reference-profile-sources"
                      id={`medicine-${activeProfile.id}-sources`}
                    >
                      <h4>Profile references</h4>
                      <div>
                        {activeProfile.sources.map((profileSource) => (
                          <a key={profileSource.url} href={profileSource.url} target="_blank" rel="noreferrer">
                            <strong>{profileSource.label} ↗</strong>
                            <span>{profileSource.sourceType} · checked {profileSource.lastChecked}</span>
                          </a>
                        ))}
                      </div>
                    </section>

                    <footer className="fred-reference-governance">
                      <div>
                        <strong>Profile {activeProfile.version}</strong>
                        <span>Updated {activeProfile.contentUpdatedAt}</span>
                        <span>Next review: {activeProfile.nextReviewDue}</span>
                      </div>
                      <p>{activeProfile.reviewNote}</p>
                    </footer>
                  </>
                ) : (
                  <div className="fred-reference-no-profile">
                    <h3>Continue with a public source</h3>
                    <p>Search the exact active ingredient, brand and dosage form. Product-specific instructions can differ.</p>
                  </div>
                )}

                <section className="fred-reference-public-sources">
                  <h4>Free Australian sources</h4>
                  <div>
                    {PUBLIC_MEDICINE_REFERENCES.map((source) => (
                      <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                        <strong>{source.label} ↗</strong>
                        <span>{source.description}</span>
                      </a>
                    ))}
                  </div>
                </section>

                <details className="fred-reference-licensed">
                  <summary>Licensed exam references</summary>
                  <p>Use these only when your university or assessment provides access.</p>
                  <div>
                    <a href="https://amhonline.amh.net.au/auth" target="_blank" rel="noreferrer">AMH Online ↗</a>
                    <a href="https://apf.psa.org.au/" target="_blank" rel="noreferrer">APF Digital ↗</a>
                  </div>
                </details>
              </article>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
