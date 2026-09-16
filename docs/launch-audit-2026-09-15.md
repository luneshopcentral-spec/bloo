# DispenseRx Practice — launch audit

**Date:** 15 September 2026  
**Verdict:** Not ready for a paid launch or an unsupervised public student launch. A supervised pilot becomes reasonable after the access-control and scoring defects below are fixed. Preserve the existing simulator; focus the next release on correctness, reliability and a coherent student journey.

## Scope and release state

- Ran `git pull --ff-only` on `agent/full-publish-readiness-audit`: already up to date at `fc848d0`.
- Fetched `origin/main` is `89be899`, the merge of that audit branch. Its file tree matches the audited branch; no application changes are missing from this checkout.
- Inspected the public deployment at https://bloo-seven.vercel.app and the same Supabase project used by its browser requests.
- Rechecked the earlier August audit rather than assuming its findings were current. Production deployment commit was not independently established through hosting metadata.
- Reviewed routes, authentication, billing, database policies/migrations, marking, content governance, storage, voice, UI, accessibility, SEO and release tooling.
- Created an isolated, ordinary test account at the user's request. Retained it for their use. Credentials are in an ignored local file, outside this report. Privileged-field probes were restored and the fabricated-score probe row was deleted.
- No application source, database schema, payment configuration or deployment was changed. No payment was made or external email sent.

## Evidence summary

| Check | Result |
|---|---|
| Lint | Pass |
| Existing unit suite | 14 files, 184 tests pass |
| Production build and TypeScript check | Pass |
| Current full dependency audit | 15 affected packages: 1 critical, 7 high, 7 moderate |
| Production-only dependency audit | 8 affected packages: 1 critical, 4 high, 3 moderate |
| Additional billing probes against actual route code | 2 failures reproduced: modern invoice payload, delayed subscription event |
| Additional directions probes against actual scoring code | Incorrect frequency and an added dose both incorrectly pass the directions check |
| Recorded patient voice manifest | Fails: all 831 expected recordings missing |
| Sign-in and dashboard | Dedicated test account signs in and dashboard loads |
| Simulator Case 1 | Patient selection, prescription, answer reveal, pack selection/placement, text consultation, results and cloud save exercised |
| Assisted attempt accounting | Saved as assisted, failed, excluded from progress; 14/24 in this deliberately incomplete consultation |
| Quiz | Four-question guided flow, reference-book opening, answer checking and results exercised |
| Phone dashboard | 488px document width in a 390px viewport; navigation/sign-out overflow |
| Automated accessibility sample | Quiz question screen has two serious contrast violations; this is not a full accessibility certification |
| Health | Live `/api/health` returns 200 and `no-store`; endpoint does not test dependencies |
| Live checkout entry | Redirects to `dashboard?checkout=profile`; customer-profile error reproduced |
| Sitemap/robots | Live URLs contain unintended double slashes |

Passing the existing tests is useful evidence, but those tests currently miss several release-critical conditions.

## Launch blockers

### 1. Students can change their own paid access — confirmed live

An ordinary student JWT successfully changed its own `has_paid` to `true` and `trial_cases_used` to `999`. Original values were immediately restored. This is an entitlement integrity failure even though another schema defect currently prevents the simulator from reading the paid flag correctly.

**Fix:** apply and verify the privileged-column protections, covering role, paid/trial and all Stripe fields. Add negative tests using a real anonymous session and ordinary student session. Keep allowed profile editing separate from privileged updates.

**Evidence:** `supabase/migrations/0011_profiles_role_and_entitlement_guard.sql`, `0013_launch_billing_and_profile_hardening.sql`; live isolated-account probe.

**Done when:** allowed name/profile edits succeed while every privileged student write is rejected or leaves privileged fields unchanged.

### 2. Production schema is behind the application — confirmed live

`profiles.study_stage`, `profiles.role`, `profiles.stripe_customer_id` and `profiles.stripe_subscription_id` are missing. `stripe_webhook_events` is missing. Attempt-progress columns do exist.

Consequences observed: the simulator's `has_paid, role` query returns HTTP 400; checkout reports that a profile cannot be found even though the account has one. Study-stage metadata cannot be persisted by the old profile trigger. Billing lifecycle storage cannot work as authored.

Anonymous requests returned records from `patients`, `patient_scripts` and `drugs`. `prescribers` returned an empty array; that alone does not establish whether its policy is permissive. Anonymous writes were not retested in this audit, so the earlier report's anonymous-insert claim remains historical.

**Fix:** back up the database, establish its migration ledger, resolve the duplicate `0011` version numbers without rewriting applied history blindly, and test the complete migration chain in staging. Apply the missing protections and billing schema in a controlled release. Remove/archive standalone setup SQL that recreates permissive policies. Generate types from the deployed schema.

**Done when:** staging and production pass schema checks, directory access tests, profile creation, paid-access lookup, checkout and webhook integration checks.

### 3. Incorrect medication directions receive a correct mark — reproduced in code

For Case 1, the expected instruction is `Take ONE capsule tds`. The actual validator marked both of these as correct:

- `Take ONE capsule two times daily`
- `Take ONE capsule three times daily plus one at bedtime`

These are test inputs demonstrating a marking error, not medication advice. `directionsMatch()` accepts 80% overlap with expected words and does not reject added dosing instructions. This finding concerns the directions subcheck; it does not claim that every other check in the whole attempt passes.

**Fix:** parse and compare dose, unit, route where relevant, frequency, duration, maximum dose and conditional instructions explicitly. Permit reviewed equivalent phrasing while rejecting changed numbers, omissions and contradictory additions. Add educator-reviewed near-miss cases to the tests.

**Evidence:** `src/lib/scoring/validate.ts:63`; `output/playwright/launch-2026-09-15-scoring-probe.txt`.

**Done when:** correct equivalent instructions pass and changed dose/frequency/additional-dose examples fail as critical errors.

### 4. Case 1's dates contradict its teaching point — confirmed in live results

The displayed prescription date was `03/09/26`, while history and feedback still used `23/06/17` and described that supply as only four days earlier. `applyCaseVariant()` moves the prescription date into the recent past but does not move the associated history/rationale. The source case originally used `27/06/17`.

**Fix:** use one explicit simulated encounter date and derive all related prescription, previous-supply, eligibility and expiry dates from it. Store factual intervals as data instead of embedding inconsistent dates in prose. Recheck all 13 cases for the same issue, including expired sample Medicare details.

**Evidence:** `src/lib/cases/variants.ts`, `src/lib/cases/static-cases.ts:54`, live Case 1 prescription/history/result.

### 5. Scores and paid-case attempts are trusted from the browser — confirmed live

A free student directly inserted a Case 13 attempt with `score: 999`, `max_score: 1`, `passed: true` and `mode: exam`. The database accepted it. The audit row was removed. `persistCompletedAttempt()` performs its entitlement check in browser code and accepts a caller-provided `caseIsFree`; that is not a server security boundary. The database insert policy checks only account ownership.

**Fix:** validate entitlements and submissions on a trusted server; calculate authoritative scores from versioned content there, validate numeric bounds and deduplicate submissions. If scores remain intentionally self-reported for a low-stakes study tool, label them accordingly and never treat them as institution-verified assessment evidence. Paid content/answer keys are also bundled into client code; consider authenticated delivery if content protection is part of the business model.

**Evidence:** `src/lib/attempts/persist.ts`, `supabase/migrations/0001_initial_schema.sql` attempt-insert policy.

### 6. Subscription handling needs two correctness fixes — reproduced locally

**Modern invoice payloads:** `subscriptionFromInvoice()` reads `invoice.subscription`. Current installed Stripe types use `invoice.parent.subscription_details.subscription`. A realistic modern payment-failed fixture returns success without applying the subscription update. The configured production webhook API version remains unverified. See [Stripe's invoice migration notice](https://docs.stripe.com/changelog/basil/2025-03-31/adds-new-parent-field-to-invoicing-objects).

**Delayed events:** processing cancellation followed by an older active subscription event restores `has_paid: true`. Event-ID deduplication does not prevent this. [Stripe does not guarantee event delivery order](https://docs.stripe.com/webhooks#event-ordering).

**Fix:** support the configured event payload version, reconcile current subscription state, serialize/conflict-protect updates per subscription, and handle duplicate/concurrent deliveries. Verify successful purchase, renewal, failure, cancellation, retry and out-of-order delivery against staging Stripe/Supabase. Prevent multiple simultaneous checkout sessions from creating duplicate subscriptions. Confirm checkout results from Stripe rather than displaying “Payment confirmed” solely because `?checkout=success` is present.

**Evidence:** `src/app/api/stripe/webhook/route.ts:103`, `:136`; additional probe copied the existing harness and exercised the actual route. Three existing probe checks passed; two new/updated conditions failed. The probe is saved as `.test.ts.txt` so it does not alter routine test discovery.

### 7. Dependency security status has changed since the previous audit

The repository pins Next.js `15.5.21`. Current advisories cover a Windows-hosted RCE and an AVIF image-optimization issue; patched Next.js versions start at `15.5.24` on this release line. The audit suggests `15.5.25`. The explicit `sharp: 0.35.3` override is also below the reported patched `0.35.4`; updating Next alone while preserving vulnerable overrides is insufficient.

These are confirmed affected dependency versions, not proof of exploitation or of every advisory being reachable on the Vercel deployment. The Windows-specific issue must not be described as a demonstrated Vercel exploit. Triage the remaining production transitive advisories too; several are inherited dependency paths rather than distinct application vulnerabilities.

**Fix:** make a controlled framework/override update, rebuild, rerun the dependency audit and the critical UI/billing/scoring checks. Do not use a blanket forced upgrade.

Sources: [Next.js Windows advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36), [Next.js AVIF advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [Sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).

### 8. Professional content approval and operating details are incomplete

All 13 case records remain `0.3.0-draft`, with 26 outstanding clinical/jurisdiction approvals. The live support page explicitly says its monitored inbox is not configured. Legal pages still require review; the operator identity and jurisdiction need confirmation. The code correctly contains a production paid-launch gate, but the website still offers monthly/annual purchase controls.

**Fix:** obtain a pharmacist educator's approval for the exact version of cases, scoring, quiz answers, references and conversation responses; obtain the appropriate legal/privacy review for the actual operator. Record reviewer, scope, evidence and review date. Configure and test a real support inbox, account/data-request handling and billing cancellation process. Use one consistent “free beta / paid access coming later” state across marketing, sign-up and dashboard until payments can work.

**Evidence:** `src/lib/governance/editorial.ts:98`, `docs/launch-readiness.md`, live support/pricing/checkout.

## UI and functionality refinements

| Area | Observation | Recommended refinement |
|---|---|---|
| Homepage | Distinctive colour system and real product screenshots. At 1440×900 the oversized headline pushes the primary hero CTA below the fold; the smaller overlapping preview obscures some caption content. | Shorten headline to “Practise dispensing before placement”, reduce desktop type/spacing and give the first CTA immediate visibility. Use one legible main screenshot, followed by clearly separated workflow previews. |
| Positioning | Review counts and environment-variable errors appear in customer-facing copy. | Keep a concise beta/content-status disclosure and move operational details to an operator checklist. Explain the three learning steps and supported laptop requirements clearly. |
| Dashboard | Phone navigation overflows and sign-out is off screen. New users see zeros without much study guidance. | Add responsive navigation/account menu; a clear “Start the guided case” action; meaningful empty states; continue/retry suggestions. |
| Simulator | Dense laptop layout is usable, and prescription windows are useful. Many labels are very small, panels obscure one another, and delayed server requests provide uneven feedback. | Preserve dispensing familiarity; improve text hierarchy, internal scrolling, recoverable window positions, loading indicators and 1280×720/1366×768/200% zoom behaviour. |
| Marking completeness | Script date/type/price are editable but not checked by `validateDispense`. | Decide which fields are assessed; implement necessary checks and label contextual fields clearly. Avoid suggesting every entry is graded when it is not. |
| Progress calculations | Dispensing competency entries overwrite earlier checks of the same category. In the two-item case the last item can hide the first item's failure. Dashboard silently uses only the latest 100 attempts. | Accumulate per-category passed/total counts, retain item detail, and label the statistics window or aggregate all attempts correctly. |
| Quiz continuity | Progress uses one browser-wide localStorage key, with no user ID or content version. It does not sync to the dashboard/database. | Save versioned quiz attempts per account and combine practice history. Until then namespace browser data by account and explain device-only storage. |
| Onboarding | First-visit completion is also browser-wide; another student can inherit the “seen” flag. | Scope preferences per account and make the tutorial easy to restart. |
| Recovery | In-progress form/conversation state is in memory. A refresh loses work; failed cloud saves have no durable retry queue. | Add account/case/version-scoped draft save, resume, visible save state and retry without duplicate attempts. |
| Assembly | Visually engaging 2.5D workbench, but only Case 1 has it. Sticker controls expose button roles but lack keyboard activation/placement handlers. | Provide keyboard pick/place/move/rotate and focus feedback. Expand to more pack types only after marking rules are reviewed. |
| Pack accuracy | Side artwork hardcodes erythromycin 250mg even for other selected packs; back artwork hardcodes `AUST R 1404X`, also used as a PBS item in the case. | Generate all faces from the selected product's data and verify identifiers/artwork. Use explicitly fictional identifiers where appropriate. |
| Consultation | Text interaction worked and local WASM matcher became ready. The heading says “Hand over this supply” even when the recorded decision is to hold it. | Make the scenario wording follow dispense/hold/refuse decisions. Add an in-context “response seems wrong” report. |
| Voice | All 831 prerecorded assets are absent. Browser-generated/system voice fallbacks exist, so this does not mean all audio is broken. Microphone and fallback audio were not exercised. | Choose a launch scope: tested text-first beta, or complete/licensed recordings plus a browser support matrix, download progress and failure recovery. |
| Accessibility | Sample axe scan flags brand/quiz-heading contrast. Custom assembly needs keyboard work; nested main landmarks exist in assembly/consultation source. | Fix contrast/landmarks and test keyboard-only plus NVDA across complete flows. Include dialog focus return, zoom, reduced motion and errors. |
| SEO | Live sitemap and robots have `//privacy`, `//sitemap.xml`, etc. Quiz title repeats the product name. | Normalize the canonical origin, use one URL helper, correct inherited titles and check indexing rules for account pages. |
| Account management | No dedicated settings area for profile details, export/deletion requests and clear subscription status. | Add a compact account/settings page and a tested support-backed process. Keep portal access available when payment problems revoke access. |

### Voice privacy and performance

The local semantic/TTS architecture is promising, but local voice generation does not imply local speech recognition. The current hook uses browser SpeechRecognition; [MDN notes that some implementations send audio to a recognition service](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition). Explain that distinction before enabling the microphone and document the actual processors/data flow. Verify retention and regional hosting with the operator; this audit is not legal certification.

`public/` currently totals about 115.2 MB, mostly generated runtime assets. The README describes an additional roughly 93 MB Kokoro download. These are not all initial-page downloads. Keep optional models lazy, disclose large downloads, cache them and test school networks/low-memory laptops. Build-reported first-load JS is 123 kB for home and 280 kB for practice. No field Core Web Vitals or Lighthouse score was measured.

## What I would add, in order

1. **Report a problem with this case.** Attach case/version/stage and the disputed marking check; let the student choose what text to include. Gives the operator a practical correction loop.
2. **A unified learning record.** Combine dispensing and quizzes, with “retry your three weakest topics” and direct links to reviewed explanations. Fix calculation integrity before adding more charts.
3. **Save and resume.** Recover a partially completed case and make save failures visible/retriable. Particularly valuable for long consultations.
4. **An educator review console.** Case versions, source dates, approvals, change history and publishing controls. This supports trustworthy expansion of the library.
5. **A structured study pathway.** Foundation workflow → safety decisions → mixed practice → timed mock session. Provide an explanation for each next-case recommendation.
6. **Later: cohort assignments and educator summaries.** Useful for university pilots once account isolation, scoring and consent are sound. Keep summaries explicitly educational; avoid unsupported competence certification.

Defer a large case expansion, more generative conversation features, full mobile simulation and elaborate gamification until the existing cases are reliably marked. Case count alone will not resolve the trust issues found here.

## Release engineering and operations

- No repository CI workflow was found. Add required lint, unit, production build, schema/RLS and browser smoke jobs, with reviewed dependency updates. Repository-host branch-protection settings were not inspected.
- Use separate staging and production databases and Stripe configurations. Retain evidence of the exact code/content/schema versions released together.
- Add error monitoring, webhook-failure alerts and a synthetic sign-in/case-save check. The current health endpoint always reports OK without querying Supabase, so it cannot detect the schema failure reproduced here.
- Add tested backup/restore, rollback and billing reconciliation procedures with an owner.
- Scope and introduce a tested Content Security Policy. Existing COOP/COEP headers support local model execution but require cross-origin integration checks. No CSP was observed live.
- Review application/platform rate limits for sign-in, checkout and write APIs. Supabase may provide platform limits; their configuration was not inspected.
- Update the README's obsolete “Phase 1” roadmap, Node prerequisite, configuration examples and migration instructions. Its claim that every migration is safely repeatable is not true of the initial unguarded `CREATE POLICY` statements.
- Consolidate the 5,442-line simulator stylesheet and split the 870-line practice page along existing workflow boundaries after correctness fixes. Avoid a simultaneous visual rewrite.

## Recommended launch sequence

| Stage | Work | Exit condition |
|---|---|---|
| 1 — Make testing trustworthy | Fix schema/RLS, authoritative submission validation, dependency patches, directions matcher and case timeline | Negative access tests and near-miss marking tests pass against the actual staging schema |
| 2 — Complete the beta experience | Phone navigation, keyboard workbench, coherent beta CTAs, per-user progress, account support and recovery | A new student can complete/revisit a case and quiz without operator assistance |
| 3 — Approve content and operations | Reviewed case/quiz/reference release, support, privacy/operator details, email verification/reset delivery, monitoring and restore drill | Named owners and recorded review evidence for the release |
| 4 — Validate payments | Fix invoice/event ordering, reconcile subscription state, staging lifecycle tests, controlled live purchase/cancellation | Correct access, receipts and recovery through the complete billing lifecycle |
| 5 — Supervised pilot, then expansion | Invite a small cohort, observe failure/completion patterns, resolve disputed marking | Stable flows and reviewed feedback; then explicitly approve paid release |

**My assessment:** the product has a worthwhile foundation: recognisable dispensing workflow, persistent prescriptions, explicit safety decisions, detailed feedback, text consultation, a useful medicines book and an engaging assembly concept. The immediate investment should make those features dependable. The next milestone should be “a reviewed case is marked correctly and saved reliably for the right student,” before “more features.”

## Limits and follow-up verification

Browser testing sampled the primary learning paths; it did not exhaust every case, wording permutation, viewport or browser. Paid-case UI completion is blocked by the live entitlement schema. No real purchase, refund, email-delivery test, microphone test, full screen-reader audit, independent clinical review or destructive migration test was performed. Administrator API creation of the test account does not prove the public sign-up/confirmation email journey. Anonymous directory writes and cross-user access to other users' personal records were not exercised.

The August audit's live hydration error was not reproduced in this session. The variant function still depends on the current local date, so cross-timezone/server-midnight determinism deserves a targeted test rather than being reported as a currently reproduced hydration failure.

Screenshots and additional probes are under `output/playwright/launch-2026-09-15-*`. Test credentials are deliberately separate in `output/playwright/launch-audit-account.private.json`; the reserved `.example` email has no mailbox and cannot receive reset mail.
