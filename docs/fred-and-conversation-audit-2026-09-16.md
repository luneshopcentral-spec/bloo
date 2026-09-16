# Fred workflow and patient conversation audit

Implementation follow-up: the [text conversation rework](conversation-rework-2026-09-16.md) addresses the conversation findings below. This audit records the earlier behaviour; refer to the follow-up for current changes, verification and remaining limits.

16 September 2026 · current local `codex/launch-hardening` working tree

## Conclusion

**The patient conversation is the largest remaining product gap.** The current implementation can recognise many phrases, but it does not reliably maintain a consistent patient, understand the purpose of a question, or mark an answer consistently. More conversational wording alone will not resolve this.

The first dispensing screen broadly follows Fred Classic's manual entry sequence. Its appearance can remain intact. The important gaps are behavioural: script-type meanings, compact direction entry, search syntax, shortcuts, repeat handling and final checking.

**Scope correction from the owner: the simulator is laptop-only.** Mobile simulator layout is excluded from the recommendations and release priorities. Desktop/laptop readability, keyboard use and reduced usable viewport sizes remain in scope.

This is an audit. Application source was not changed during this pass. Earlier uncommitted launch fixes remain intact.

## What was tested

| Check | Result and boundary |
|---|---|
| Existing automated suite | 209 tests across 17 files pass. These tests do not establish conversation quality; the independent probes below exposed gaps they miss. |
| Lint | Pass. |
| Production build | Pass; all 30 routes generated/compiled. |
| Dependency audit | Zero known vulnerabilities reported during this pass. |
| Conversation content | All 13 case rubrics; all 358 authored topic examples tested against the final rules-based marker. 355 examples matched their intended topic; 3 did not. Two authored examples were also incorrectly flagged as unsafe. |
| Complete authored conversations | One conversation per case, using each topic's first example: 11 passed; Cases 2 and 4 failed on their own authored wording. This is a deterministic content check, not an estimate of real student accuracy. |
| Targeted language probes | 17 inputs covering negation, contradictory dosing, history questions, compound questions, shorthand replies and natural paraphrases. Full inputs and outputs are retained locally. |
| Actual browser conversation | Chromium with the real local WASM semantic model: dialogue, final marking, draft reload, teach-back, voice controls, text fallback and input limits. |
| Laptop layout | Text consultation at 1440×1000, 1366×768 and 1280×720 had no horizontal overflow. At 1093×614, representing a smaller usable viewport, the finish button extended slightly below the viewport. Actual OS/browser zoom and screen-reader testing remain outstanding. |
| Accessibility | The conversation screen has a contrast failure on the inactive voice-mode button: 4.35:1 at 10px. Automated scans do not replace keyboard/screen-reader review. |
| Voice | Mode switching, muting and a deliberately simulated microphone-permission denial. The denial message worked, but existing unsent text was erased. No real microphone recording or listening-quality assessment was performed. |
| Recording assets | `voice:check` still reports 831 missing recordings. Recorded playback is disabled by default; this does not prevent text use. |
| Fred fidelity | Official Fred Classic workflow/shortcut documentation, and separately Fred Dispense Plus FinalCheck/scan-check documentation; local form and search/SIG probes. No licensed Fred installation was operated. |
| Persistence | Real test-account authentication; later-stage browser work used controlled local draft fixtures and a failed-save API stub. Production migrations are still missing, so successful live end-to-end saving was not claimed or retested here. |

## Priority 1 — resolve before relying on scored consultation practice

### 1. Make the patient facts consistent across the entire case

**Evidence:** Case 1's patient record contains `PENICILLIN (rash)` and “Hypertension — on Amlodipine 5mg od”. The conversation replies say there are no known medicine allergies and no regular medicines. Its previous-use responses also describe a first antibiotic supply despite the case's documented recent dispensing.

Case 4 has another discrepancy: the record says the patient is on sertraline, while the conversation says there is nothing prescribed regularly. These are not presented or scored as intentional medication-reconciliation challenges.

**Work needed:** one authoritative case facts object for identity, allergies, current medicines, history and encounter date. Generate the record, patient replies, prescription context and marking criteria from it. If a patient deliberately omits or misunderstands something, author that discrepancy explicitly and score its discovery.

**Acceptance:** every case's structured facts agree across all surfaces, or a documented reconciliation scenario explains the difference. Add checks for both reply variants, not just one example.

Source: `supabase/seeds/patient-library.ts`, `supabase/seeds/patient-history.ts`, `src/lib/conversation/cases.ts`.

### 2. Correct the hold-versus-supply conversation branch

**Evidence:** Case 1 correctly requires holding supply for an early repeat. The conversation header reflects that decision, but its rubric still requires dosing instructions and rewards course-completion advice. Explaining the hold matched no rule topic. In the real semantic browser run, that explanation was mistaken for an introduction and prompted a question about stopping the course early.

Case 1 also requires pack assembly despite the correct hold decision. The prototype explains this separation in a note, but the combined learning sequence remains confusing.

**Work needed:** distinct consultation plans for supply, hold/contact prescriber, and urgent referral/no supply. Tie the patient responses, required checks, teach-back and completion criteria to the selected and expected disposition. Separate the pack-labelling exercise from a withheld-supply case, or make the transition explicitly hypothetical.

**Acceptance:** a complete, appropriate hold explanation can pass the hold case without instructing the patient to start the withheld medicine. A routine handover must not pass that branch.

### 3. Fix negation, conditional statements and contradictory advice

**Reproduced failures:**

- Case 2's authored warning beginning “Do not take ibuprofen…” is flagged as unsafe reassurance because the sentence later contains “is safe”. Its otherwise complete conversation scores 11/12 and fails.
- Case 4's authored explanation of alcohol-related risk is flagged as reassuring the patient that alcohol is safe. It also scores 11/12 and fails.
- “I will not supply this today until I contact your doctor” is flagged as promising supply.
- “Do not refrigerate these capsules” is flagged as refrigeration advice.
- “I will not confirm your full name or date of birth” receives both identity checks.
- After an otherwise complete Case 1 conversation, adding “Take five capsules three times a day” still produces **13/13 and a pass**, with no unsafe-advice finding. Previously earned checks are never withdrawn for this contradiction.

**Work needed:** assess the actual assertion, its negation, subject, timing and conditions. Detect conflicting instructions across turns. Distinguish quoting a wrong instruction, asking about it, correcting it and endorsing it. A phrase similarity score cannot provide this safety decision by itself.

**Acceptance:** clinician-reviewed positive/negative sentence pairs and multi-turn corrections must give the intended result. All 358 existing examples must either pass their intended check or be rewritten to satisfy the actual criterion.

Source: `src/lib/conversation/matcher.ts`, `cases.ts`, `score.ts`.

### 4. Use the same evidence interpretation for dialogue and final marking

**Browser evidence:** “Would you mind telling me what you are called?” produced “It's John Smith” through the real semantic model. The final assessment nevertheless failed “Confirm the patient's full name”, because completion re-runs only the rules matcher. The server also uses rules-only grading.

The semantic model made other incorrect assignments: “Have you taken this before?” matched the invitation-to-questions topic, bypassing the dedicated previous-use response. “Are you feeling nauseous?” triggered both administration advice and an allergy answer; final marking awarded practical nausea advice even though none was given.

**Work needed:** one authoritative, versioned evidence interpreter, shared by the patient interaction and final assessment. Separate history questions, explanations, instructions, responses to a patient question and safety decisions. Preserve server-side grading; do not fix the mismatch by trusting client-provided topic IDs.

**Acceptance:** a response the system treats as a successful identity question must not later be marked absent. Symptom questions cannot earn counselling-action credit. Performance must be consistent before and after the optional model finishes loading.

### 5. Give the patient actual conversation state

**Evidence:** replies are selected from topic/intent phrase lists. The classifier receives the current utterance without the preceding dialogue. Scored topics suppress other response intents, and replies cover at most three selected topics. Compound questions therefore lose parts of the answer. A short contextual reply such as “With a meal” is not connected to the patient's preceding concern.

Reload testing exposed a concrete memory defect: the patient acknowledged a dose, the page was reloaded and the transcript restored, then teach-back elicited “Could you go through the instructions with me first?” The restored transcript was visible, but `addressedTopicIds` and `concernShown` restarted empty.

**Work needed:** persist/reconstruct a patient state containing known facts, information already disclosed, advice understood, unresolved questions, concerns and disposition. Answer all requested facts or ask one targeted clarification. Teach-back should reflect what the patient understood and allow the student to correct a misunderstanding.

**Acceptance:** the same follow-up question gets a coherent answer before and after reload; a multi-part history question does not silently drop medication history; the patient can respond to “why?”, “which one?” and a short answer in context.

## Priority 2 — reliability and usability

### Input and retry limits must match the server

The browser accepts a 2,001-character message and enables Send, but the server submission schema rejects any message longer than 2,000 characters. It also rejects more than 150 transcript messages: 75 student/patient exchanges plus the opening already exceed that limit. The UI has no corresponding turn cap. Retry cannot repair an intrinsically invalid queued submission.

Add compatible input/turn budgets, clear validation before sending, structured server error details and an edit/recover path for a rejected submission. Do not silently truncate counselling evidence.

### Voice must preserve work and remain optional

Starting recognition clears the current input before permission succeeds. In the simulated denial test, the error was explained correctly but the unsent draft was lost. Keep existing text until a new transcript is successfully accepted, with a clear append/replace interaction.

Switching to voice immediately starts patient speech generation and can disable Start speaking while the voice loads. Provide an intentional audio-enable action, cancel/loading feedback and clear first-use expectations. Fix the low-contrast 10px mode control. Real accents, medicine names, numbers, interruptions and speech output quality still need human audio testing.

### Improve the learner's feedback

Current successful feedback says a topic was addressed, without identifying the supporting utterance. Show the exact student evidence, what it demonstrates, what is missing and an editable/practisable example. Clearly distinguish a clinical error from a response the matcher could not interpret. Add uncertainty/review rather than confidently awarding a wrong safety judgement.

For laptops, enlarge the small supporting text and controls, keep the composer/finish action reachable in short viewports, and use the side panel for useful case information and progress guidance. Keep detailed answers hidden in exam mode. Simulator mobile work is out of scope.

## Fred comparison: preserve the form, improve the behaviour

The existing form is recognisably based on **Fred Classic**. Fred Dispense Plus is a separate comparison for newer checking workflows; blending both products' shortcut meanings would be misleading.

| Area | Finding | Recommended work |
|---|---|---|
| Manual entry | The main patient → prescription → prescriber → product → directions → quantities → initials sequence is represented. | Preserve the familiar structure. [Fred Classic workflow](https://webhelp.fred.com.au/freddispense/help-topics/dispense-process.htm) |
| Script types | The simulator labels `R` as Repeat; Fred Classic documents `R` as Repat. The simulator's S/C choices also conflate entitlement with script type. | Correct the domain model and dropdown meanings before calling it faithful practice. [Script types](https://webhelp.fred.com.au/freddispense/help-topics/dispense-process.htm) |
| Search behaviour | Local `SMITH, JOHN` and `AMOXY C 2` searches return zero results, while simpler searches find entries. | Support the documented patient and product search forms. [Search entry](https://webhelp.fred.com.au/freddispense/help-topics/dispense-process.htm) |
| Directions | `1tds` stays unchanged; spaced abbreviations expand. A leading slash does not disable expansion. | Implement compact, dosage-form-aware Smart SIG behaviour with a literal-text escape. [Direction entry](https://webhelp.fred.com.au/freddispense/help-topics/dispense-process.htm) |
| Keyboard use | F2, F3 and F8 produced no application change; source contains no corresponding simulator bindings. | Add a documented Classic keyboard map, focus movement and directory selection. [Fred shortcuts](https://webhelp.fred.com.au/freddispense/help-topics/keyboard-shortcuts.htm) |
| Repeats and prices | Repeat entry is simplified; price is explicitly unmarked. | Add representative own/outside repeat and deferred-script exercises; define a simulated pricing scope. [Repeat/price workflow](https://webhelp.fred.com.au/freddispense/help-topics/dispense-process.htm) |
| Scan checking | The current physical-pack exercise is only Case 1 and is not a barcode scan workflow. | Add simulated label-to-pack barcode matching, wrong-pack handling and multi-pack completion. Real scanners are optional. [Plus scan check](https://webhelp.fred.com.au/dispense/Dispense/enhanced-scan-check.htm) |
| Final check | Results appear after the consultation; there is no distinct student-operated final verification workflow. | Add a pre-handover check with prescription, selected product, label, patient history, corrections and checker acknowledgement. [Plus FinalCheck](https://webhelp.fred.com.au/dispense/Dispense/final-check.htm) |
| Intervention documentation | A hold/referral decision is selected, but no structured prescriber-contact outcome or intervention record is completed. | Let students document the problem, recommendation, response and plan. [Fred clinical interventions](https://webhelp.fred.com.au/dispense/Dispense/clinical-intervention.htm) |

Real PBS claiming, live MyHR, eRx/MySL and commercial dispensing integrations are not necessary to improve this student simulator. Selected **simulated** scenarios would provide training value without becoming a production dispensing system.

## Recommended implementation order

1. **Authoritative case facts and disposition:** reconcile Cases 1 and 4, then review every case; separate supply/hold/referral conversation paths.
2. **Reliable assessment:** fix negation/contradictions and align runtime interpretation with final grading. Build an independent, reviewer-approved test set, not just tests that repeat current regular expressions.
3. **Stateful patient dialogue:** maintain context, answer compound/follow-up questions, support clarification and reconstruct state after reload.
4. **Recovery and laptop UX:** match input/server limits, preserve voice drafts, improve feedback evidence and control readability.
5. **Fred behaviour fidelity:** correct script types, compact SIGs, search syntax and keyboard workflows without redesigning the first-stage form.
6. **Broaden the training loop:** final checking, scan checking and prescriber intervention notes; then additional reviewed cases and optional voice polish.

An LLM could help phrase patient replies naturally later, but it should be constrained by the case facts and state. It should not invent patient history or become the sole judge of clinical correctness. The first four steps remain necessary with or without an LLM.

## Evidence files

- `output/conversation-audit.mts` and `output/conversation-audit-results.json`: all-case rubric audit, 358 examples, targeted inputs, complete conversations and contradictory-dose proof.
- `output/fred-comparison-probes.mts` and `.json`: search/SIG checks and record-versus-dialogue facts for all cases.
- `output/conversation-limit-probes.mts` and `output/conversation-limits.json`: accepted baseline versus rejected long-message/long-transcript submissions.
- `output/playwright/conversation-browser-probes.txt`: actual semantic candidates and patient responses.
- `output/playwright/conversation-final-mark.txt`: final assessment contradicting the understood name question.
- `output/playwright/conversation-recovery-proof.txt`: lost conversation state after reload.
- `output/playwright/conversation-mic-denied.txt`: simulated permission denial and erased input.
- `output/playwright/conversation-desktop-audit.png` and `fred-form-laptop-audit.png`: UI evidence.

These local diagnostic artifacts are ignored by Git. They contain fictional test scenarios. Production migration, real payment, email and microphone checks remain separate from this assessment.
