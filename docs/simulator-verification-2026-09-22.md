# Simulator verification — 22 September 2026

## Follow-up refinement pass

- Unsent consultation text now survives draft resume on this device. Clear draft
  gives an explicit way to discard it, including at the conversation limit.
  Unsent text is never submitted for assessment.
- Results offer a fresh attempt at the same case. Learn/tutorial/assisted results
  offer **Try this case independently**, which resets the entry and switches to
  Practice mode. The tutorial points directly to this action.
- Results show Retry save even when creation of the tracked session failed.
  Saving starts before that request; result navigation remains disabled until
  the result is saved and verified.
- Pending warning-label selections reset when switching prescription items,
  preventing a choice for one medicine from carrying across to another.
- The patient understands more everyday history wording, including “DOB
  please?”, “Are you taking anything else?” and plural “reactions”. Requests
  such as “Could you say that once more?” replay the last patient response
  without awarding another assessment check.
- Consultation action hints are larger; action/footer rows can wrap on smaller
  laptop viewports.

Validation for this pass: **362 tests across 25 files**, ESLint, TypeScript and
the production build passed. New language tests cover all 13 cases, with
negative examples for skipped checks and non-history statements. Actual Edge
browser checks at 1366×768 and 1280×720 verified unsent-draft reload, exclusion
of unsent text from submissions, save failure/retry, same-case reset, independent
practice after the tutorial, isolated warning selections, and recovery from a
60-turn draft with unsent text. The tutorial's final step appeared inside the
results dialog; its scoped axe scan returned zero violations.

These follow-up browser checks use prepared drafts and intercepted session/save
responses, including deliberate 503 failures. They do not write synthetic grades
to the shared database. Clinical facts, prescription layout and voice behavior
are unchanged; the assessed language coverage is broader.

## Fixes

- The floating prescription no longer covers directory selection buttons or
  results. Its tab stays accessible, and its zoom shortcuts ignore typing in
  form fields and other dialogs.
- Patient, medicine and prescriber directories show bundled case records
  immediately. Superseded searches are cancelled, stale responses are ignored,
  and a failed database request leaves the bundled results usable.
- The assembly tutorial derives its current step from the actual bench. Changing
  packs, removing labels or moving them onto unsafe areas returns the guide to
  the relevant check. Back to dispensing and Reset bench now work during the
  tutorial; returning rechecks the entry and retains the bench draft.
- Case and mode changes protect unfinished work with a cancellation option.
  Delayed answer-reveal responses cannot populate a different attempt.
- Drafts retain a manually entered prescriber as well as the prescriber number.
  Changing attempts clears pending field-search timers; medicine search can be
  reopened with Enter. Opening one directory closes the other.
- Results explicitly distinguish provisional, saving and saved results. Failed
  saves can be retried inside the results dialog, and Next Case remains disabled
  while a result is pending. Keyboard focus no longer resets on every result
  update; expandable feedback participates in the dialog's Tab boundary.

The dispensing form layout, clinical case content and assessment rules remain
unchanged. No database migration or payment configuration is required.

## Verification completed

| Check | Result |
| --- | --- |
| Automated regression suite | 345 tests passed across 25 files, including four new assembly-guide recovery tests. |
| Static checks | ESLint, TypeScript and production Next.js build passed. |
| Full guided Case 1 | Completed all 20 steps through prescription, patient/prescriber/product selection, label entry, held-supply decision, physical assembly, 14 natural dialogue turns and results: 24/24. |
| Tutorial recovery | Removed a warning, selected a lookalike pack, returned to dispensing and reset the bench. The guide returned to the correct unfinished check each time. |
| Reload/resume | Form, assembly, tutorial step and transcript restored. Newly entered patient and custom prescriber also survived reload. |
| Cases 2–13 | Restored authored dispensing fixtures, submitted each through the UI, sent each case's authored conversation examples, and reached passing results for all 12 cases on a local production build. Case 13 retained distinct directions for both items when switching tabs. |
| Search reliability | Deliberately held an older patient response while changing surnames; it did not replace the newer results. Prescriber and medicine selection remained available with network requests deliberately failed. |
| Unsaved work | Cancelling a case or mode change retained the selected patient and current case/mode. |
| Save failure/retry | An intercepted 503 retained the result and showed Retry save inside the dialog; an intercepted successful retry cleared the local queue and enabled Next Case. |
| New patient | Incomplete entry was rejected; completed details could be saved to the attempt. |
| Exam controls | Pause, resume and reset worked; answer reveal remained unavailable in Exam mode. |
| Medicines reference | Search opened the Warfarin profile; closing restored focus to the launcher. |
| Laptop layout | Inspected 1366×768 and 1280×720 views, including the assembly, consultation, results and two-medicine entry. |
| Accessibility | Scoped axe scans of the consultation and result dialog returned zero violations. |

## Scope of the evidence

The browser tests used a dedicated synthetic student. Case 1 was entered through
the actual controls. The remaining cases used prepared dispensing drafts to
exercise every stage transition and conversation without repeating all data
entry. Paid-case entitlement and attempt endpoints were intercepted for this
isolated browser run; no test grades or new patient/prescriber records were
written to the shared database. These checks do not claim 13 new production
database transactions. Real production redemption and attempt persistence were
checked separately in the [student-pilot verification](student-pilot-readiness-2026-09-22.md).

The conversation engine remains case-grounded, with clarification for wording
it does not recognise. These checks cover authored examples and the tested
paraphrases, not every possible student sentence. Clinical/educator approval and
real student email delivery remain the owner checks in the pilot checklist.
Speech recognition and text-to-speech redesign remain deferred.

An initial multi-case browser run was interrupted by a local development/build
output collision. It was rerun successfully against the completed production
build with the development server stopped.
