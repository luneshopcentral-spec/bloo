# Text conversation rework — 16 September 2026

## Outcome

The simulator now uses one stateful conversation engine for the patient response, resumed conversations, local feedback and authoritative server marking. The browser-only embedding model no longer controls the active consultation. Case content version is `0.5.0-draft`; old drafts/sessions must start again under the revised rubric.

The dispensing form's appearance is preserved. This pass targets laptop text consultation. Speech recognition and speech-generation design remain deferred; existing voice contracts are preserved, including registering the new recap lines in the audio manifest.

## What changed

- History questions and counselling instructions are interpreted separately. Asking whether the patient feels nauseous no longer earns nausea counselling credit or triggers an unrelated allergy denial.
- Common contractions, paraphrases, basic spelling variants and compound questions are supported. Medicine names and dose numbers are never corrected fuzzily.
- The patient can answer several questions in a message, including previous medicine use alongside scored history questions. Repeated questions remain answerable.
- Dialogue state tracks demonstrated topics, student evidence, partial instructions, the current patient question and recently discussed facts. It is reconstructed from student text on resume; submitted patient replies and client topic IDs cannot award marks.
- Partial instructions accumulate without inventing missing details. For example, “Give Liam 10 mL” prompts for frequency and duration; “Three times a day” then prompts only for duration. “For ten days” completes that instruction and earns the same credit in the browser and on the server.
- Teach-back reflects the plan actually discussed, including the hold and follow-up plan. Conflicting advice produces a request for clarification.
- Unsafe-advice matching respects the scope of negation. Safe authored warnings in Cases 2 and 4 no longer fail their own rubric. Dose contradictions and common double-dose paraphrases are detected; contradictory dosing withdraws dose credit. Safety incidents remain visible even if later advice is corrected.
- John's penicillin rash, amlodipine and recent erythromycin use now agree with his record. David reports sertraline and explicitly explains that recent drinking differs from the recorded remission history.
- Case 1 requires explaining the early repeat, holding supply for clarification and communicating follow-up. Routine directions/course/nausea discussion remain available but are not mandatory handover checks for a held supply.
- Results include expandable student quotations. The composer shares message, turn and overall transcript limits with the submission validator, and cannot finish with an unsent draft response.
- Consultation typography, contrast, keyboard scrolling and short laptop viewport fit improved. The initial dispensing form was not redesigned.
- Bundled patient history displays immediately and no longer sends synthetic local IDs to a database UUID filter. Stale history responses cannot replace a newly selected patient's history.

## Verification

- Final automated run: **261 tests passed across 18 files**. ESLint and the production build also passed against the workspace snapshot, including the concurrent changes present at that time.

- Automated regression coverage includes every authored example in all 13 cases, all 13 complete authored conversations, varied wording, negative statements, mixed questions/advice, incremental instructions, context follow-ups, replay/tampered transcripts, dose contradictions, safe warnings, hold-case scoring and server/browser parity.
- All 13 consultation cases were exercised through the actual Chromium UI with their assessed authored examples. All achieved the expected complete **patient-interaction** scores. This does not establish the accuracy of arbitrary student language.
- A separate 14-turn Case 1 conversation used natural identity/history wording, confirmed record-consistent answers, reloaded and resumed the draft, performed teach-back and received matching assessment credit.
- Real UI checks verified Enter-to-send, the 2,000-character input cap and prevention of finishing an unsent response.
- No horizontal overflow and the finish button remained inside the viewport at 1366×768, 1280×720 and 1093×614 (representative of laptop zoom).
- Axe reported zero violations within the tested consultation screen after fixes for keyboard access to the transcript, sidebar semantics and button contrast. This is not a complete assistive-technology certification.

Browser evidence (ignored local artifacts):

- `output/playwright/conversation-ui-cases-1-6.txt`
- `output/playwright/conversation-ui-cases-7-13.txt`
- `output/playwright/conversation-rework-final-checks.txt`
- `output/playwright/conversation-rework-final.png`

Browser tests used authenticated, synthetic account/draft fixtures. Paid entitlement was stubbed only inside the test browser for the remaining cases; account permissions were not changed. Attempt writes were intercepted and returned an isolated-test error. These are dialogue/UI tests, not proof of production persistence or billing readiness.

## Remaining limits and launch work

This is a structured, case-authored patient with improved context and language handling, not an unrestricted generative patient. Unseen phrasing can still need clarification. The unsafe-advice rules cannot establish that arbitrary prose is clinically correct. Educator review and a held-out corpus of real student wording are still required before making grading-accuracy claims.

Clinical/jurisdiction sign-off remains pending. The new symptom/fact wording and revised hold rubric require that review. No clinical approval was recorded by this implementation.

At the final health check, the configured database readiness endpoint still returned HTTP 503. Apply and verify the required database upgrades before claiming saved-attempt readiness. No production deployment was performed by this conversation pass. Concurrent admin/access-control work in the workspace is separate.

The earlier Fred comparison remains the source for outstanding form-workflow work, including keyboard shortcuts, tokenized directory search, compact SIG entry and final checking. Speech/TTS viability remains a later project, as requested.
