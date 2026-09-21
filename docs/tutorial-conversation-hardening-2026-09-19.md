# Guided tutorial and conversation release — 19 September 2026

## Changes

- Reworked first-run onboarding with a direct guided-case entry point, an optional stage reference, and managed keyboard focus.
- Expanded the tutorial to 20 steps. Conversation steps track individual objectives across turns using the same interpretation as the patient and server marking. Examples are optional; students can use their own words.
- Saved tutorial position with the local case draft. Starting a new tutorial protects an unfinished draft with a replacement confirmation.
- Kept the dispensing form layout. Label guidance now accepts equivalent directions and no longer blocks on the optional, unassessed price field.
- Placed consultation guidance beside the transcript, with a wider laptop sidebar, minimisation and relocation controls where applicable. The completion guide sits inside the feedback dialog and its keyboard focus boundary.
- Improved indirect questions, short identity questions, medicine/allergy paraphrases, repeated answers and follow-ups after acknowledgements. History questions do not earn counselling credit. An unanswered patient question remains active when questions are invited again.
- Partial hold explanations now prompt for the missing part. Teach-back requires an explained plan and no active advice conflict. Recognised dose and supply corrections clear the active conflict but preserve the original safety incident in assessment.
- Updated the shared case/rubric version to `0.6.0-draft`; old-version unfinished drafts require a fresh case to avoid mixing grading versions.

## Verification

- 334 tests across 25 files passed, including all 13 cases' authored conversation examples and 30 focused natural-language/tutorial checks.
- ESLint and production Next.js build, including TypeScript validation, passed.
- Authenticated browser walkthrough: onboarding → prescription → patient/prescriber/product selection → equivalent label directions → hold decision → pack selection → main label → warning placement and keyboard rotation → consultation → results → finish tutorial.
- Natural dialogue across 14 student turns completed the guided case at 24/24; no answer-reveal feature was used.
- Reload/resume restored the tutorial step, transcript, form and assembly. The allergy follow-up retained context across an acknowledgement.
- Checked laptop viewports at 1366×768, 1280×720 and 1093×614. Consultation actions remained inside the viewport. Fixed the guide footer contrast issue found by axe; subsequent consultation and result-dialog scans reported no violations.
- Browser test used the existing synthetic student. Session creation and attempt writes were intercepted, with a deliberate attempt-save failure to keep test results out of cloud progress. The retryable pending-result state appeared. This run does not establish successful production database persistence.

## Remaining boundaries

- This improves the deterministic, case-grounded conversation engine; it does not provide unrestricted understanding of arbitrary questions. Unrecognised wording still requests clarification. Only explicitly recognised corrections resolve active safety conflicts; a fresh attempt may be needed for other errors.
- Case clinical/legal approval remains separate and unchanged. This engineering release is suitable for the next structured tester round, not evidence of clinical sign-off.
- Speech recognition and text-to-speech redesign remain deferred. No payment settings or schema migrations are part of this release.
- The accessibility scan is scoped to the tested screens, not a full accessibility certification.
