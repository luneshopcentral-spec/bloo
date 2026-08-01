# DispenseRx Practice: full publish-readiness audit

**Audit date:** 2 August 2026

**Repository:** `luneshopcentral-spec/bloo`

**Audited revision:** `46b73344995abd4ac5c31b2944d61517972e0371`

**Production URL:** `https://bloo-seven.vercel.app`
**Scope:** the complete public website, authentication, dashboard, simulator, guided tutorial, physical-pack workbench, consultation, quiz, Supabase data layer, Stripe integration, legal/support pages, deployment controls, repository quality, security, responsive behaviour, accessibility and release operations.

## Executive verdict

**Do not open paid public access yet.** The application has a strong product concept, a convincing Fred-style dispensing workflow, a useful guided tutorial and a promising Case 1 physical-pack workbench. However, the live Supabase project is behind the repository migrations and currently permits operations that should never be available to an anonymous or ordinary student account. The same schema drift breaks paid checkout and entitlement handling.

A small, explicitly labelled free beta could continue only after the database/RLS issues, live hydration error and mobile authenticated navigation are fixed and retested. A paid public launch additionally requires independent clinical and legal approval, a real support channel, complete billing validation, monitoring and a controlled release process.

### Release status at a glance

| Area | Status | Release impact |
|---|---|---|
| Database and access control | **Blocker** | Live schema is behind; anonymous directory access and client entitlement changes were verified. |
| Paid checkout and subscriptions | **Blocker** | Live checkout fails before the intended launch gate because billing columns/tables are missing. |
| Clinical and legal review | **Blocker** | All 13 cases still carry draft/review-required records; legal pages state review is required. |
| Support operations | **Blocker** | The public support page says its monitored inbox is not configured. |
| Core simulator | **Strong beta** | Fred-style workflow is convincing and functional, with several release-hardening issues. |
| Guided tutorial | **Strong beta** | Eighteen-step interactive walkthrough covers dispensing through results. |
| Physical-pack workbench | **Case 1 prototype** | Attractive 2.5D implementation, but only Case 1 uses it and keyboard operation is incomplete. |
| Consultation and quiz | **Functional beta** | Useful content, but draft governance, missing voice assets and cross-user quiz progress need work. |
| Marketing and auth | **Mostly polished** | Good presentation; slow screenshots, generic auth metadata and premature paid CTAs reduce trust. |
| Mobile/responsive | **Mixed** | Marketing works at phone width; the authenticated header overflows. Simulator is intentionally laptop-first. |
| Automated release assurance | **Insufficient** | Unit/build checks pass, but there is no CI, E2E, accessibility, performance or production smoke suite. |

## Severity definitions

- **P0 - launch blocker:** creates a security, data, payment, legal or clinical-safety risk. Must be closed before public launch.
- **P1 - high priority:** materially harms correctness, access, trust, usability or operational reliability. Close before a broad beta or paid launch.
- **P2 - refinement:** visible polish, maintainability or quality issue that should be scheduled before or immediately after launch.

## P0 launch blockers

### P0-01: apply and verify the missing Supabase migrations

The live database does not match the code in the repository. Direct read-only schema probes showed that `profiles.study_stage`, `profiles.role` and `profiles.stripe_customer_id` do not exist, and `stripe_webhook_events` does not exist. Newer attempt columns do exist, so production appears to have received only part of the migration history.

This breaks multiple current code paths:

- practice access selects `has_paid, role`; a missing `role` can make the complete query fail;
- checkout selects `stripe_customer_id` and fails before it reaches the intentional paid-launch gate;
- webhook idempotency depends on `stripe_webhook_events`;
- subscription lifecycle fields cannot be written;
- sign-up sends `study_stage`, but the old live profile trigger cannot preserve it.

Relevant source:

- `supabase/migrations/0011_profiles_role_and_entitlement_guard.sql`
- `supabase/migrations/0011_remove_anon_directory_access.sql`
- `supabase/migrations/0012_stripe_customer.sql`
- `supabase/migrations/0013_launch_billing_and_profile_hardening.sql`

**Required action**

1. Back up the live Supabase project and record the current migration state.
2. Resolve the two migrations that share the `0011` prefix so ordering is unambiguous.
3. Apply the missing migrations in a staging project first, then production.
4. Generate database types from the deployed schema instead of relying on a hand-maintained approximation.
5. Add a deployment check that fails when the live schema and expected migration set differ.

**Done when:** the expected columns, trigger functions, indexes and webhook table exist in staging and production; a full sign-up, practice-access, checkout, webhook and cancellation test passes against that exact schema.

### P0-02: close anonymous directory access immediately

Using only the public anonymous key and no signed-in session, the audit verified:

- reads were allowed on `patients`, `patient_scripts`, `drugs` and `prescribers`;
- an anonymous insert into `patients` was accepted.

The isolated test record was deleted immediately and its absence was verified. Even though the directory data is fictional training data, anonymous mutation allows vandalism, poisoning of student results and uncontrolled database growth. It also contradicts the authenticated simulator experience.

`0011_remove_anon_directory_access.sql` is intended to close this hole, but it has not reached production. The standalone files `supabase/setup_patients.sql`, `supabase/setup_drugs.sql` and parts of the early migration history can recreate permissive policies, so they are an operational trap.

**Required action**

- Apply the restrictive policy migration.
- Remove or clearly archive unsafe setup SQL; seed with the service-role key from a trusted server-side process only.
- Add automated negative RLS tests for anonymous select/insert/update/delete across every directory table.
- Rate-limit any deliberately public endpoint rather than granting public table access.

**Done when:** all four operations are denied for the anonymous role and only the explicitly required operations are available to authenticated students.

### P0-03: prevent students from granting themselves paid access

A temporary ordinary student account was able to update its own `profiles.has_paid` and `profiles.trial_cases_used` values using the public client configuration. The audit restored the original values and later deleted the temporary account, verifying that its profile and attempt rows were gone.

This is a direct entitlement bypass. It exists because the live project is missing the privileged-column guard in the repository migrations.

**Required action**

- Apply and verify the profile entitlement trigger/guard.
- Deny client writes to `has_paid`, `role`, Stripe identifiers, subscription state and trial counters.
- Permit those changes only through trusted service-role code.
- Add negative tests using a real student JWT, not just unit mocks.

**Done when:** a student can update allowed profile fields such as their name, but every privileged-column mutation is rejected or reverted and logged.

### P0-04: keep paid purchase controls closed until billing is operational

On production, selecting the A$13/month plan returned to `/dashboard?checkout=profile` with “Your customer profile could not be found”. The profile existed; the query failed because `stripe_customer_id` is absent. This exposes an internal deployment problem instead of the intentional “paid launch not open” state.

The source contains several good protections: Stripe price validation, terms consent, webhook signature checking, intended event idempotency, subscription grant/revoke handling and `PAID_LAUNCH_APPROVED`. These protections cannot compensate for the missing live schema.

**Required action**

- Hide or disable purchase controls while paid launch is closed, or send users to a waitlist.
- Move the release-readiness response before database-dependent checkout work where practical.
- Apply the billing schema and configure production Stripe price IDs, webhook secret and portal.
- Test successful payment, duplicate webhook delivery, payment failure, cancellation at period end, immediate cancellation, renewal and refund/support handling.
- Reconcile Stripe state to Supabase with an operator-accessible recovery procedure.

**Done when:** real production-mode test payments and lifecycle events produce the correct entitlement exactly once, errors are user-friendly, and an operator can reconcile discrepancies.

### P0-05: complete independent clinical, source and legal review

All 13 case editorial records are marked `0.3.0-draft`, and every recorded clinical and jurisdiction/legal review remains `review_required`. The medicine learning profiles and quiz content also identify themselves as supervised-learning drafts requiring source-by-source review by an Australian pharmacist educator.

This is correctly enforced by the paid-launch readiness code and honestly disclosed in the interface. It remains a hard launch blocker because the product teaches medication supply decisions and patient counselling.

**Required action**

- Have an appropriately qualified Australian pharmacist review each case, answer, critical rule, warning label, conversation response and medicine profile against current primary sources.
- Complete the jurisdiction/legal review for the intended states/territories and product claims.
- Store reviewer identity, evidence links, scope, version and review date; do not use a boolean-only approval.
- Define an expiry/re-review cadence for medicine, PBS, poisons and professional-practice content.
- Re-run regression tests whenever approved content changes.

**Done when:** all content included in the paid product has traceable approval for the exact deployed version and the release gate reports zero outstanding reviews.

### P0-06: establish a real operator, legal position and support channel

Production `/support` states that a monitored inbox is not configured. The privacy and terms pages display “Pre-launch legal review required”, and the operator identity/venue remains a product-name placeholder rather than a verified entity with contact details.

**Required action**

- Configure and test a monitored support address on a branded domain.
- Publish the correct legal entity, ABN if applicable, contact address, governing venue and refund/cancellation handling.
- Obtain legal review of the privacy policy, terms, educational disclaimers, subscription wording and data processors.
- Define incident, complaint, clinical-content correction and account-deletion procedures with response targets.
- Verify all support links from authentication and billing errors.

**Done when:** a user can reach a monitored team, the operator is unambiguous, legal approval is recorded and the team has rehearsed the main support/incident paths.

## P1 functional, UI and operational issues

### P1-01: fix the production hydration mismatch in the simulator

Production `/practice` logged React hydration error `#418`, indicating that server-rendered and client-rendered text differed. The likely root cause is deterministic case selection combined with a non-deterministic date: `applyCaseVariant` defaults `now` to `new Date()`, while the practice page calls it during both server and client rendering. Around the UTC/Australia date boundary, the generated script date can differ.

This was observed on production and did not reproduce on the local Sydney-configured server, which is consistent with a timezone boundary issue.

**Required action:** compute a stable attempt timestamp once and pass it through every case-variant render, or generate the variant exclusively on one side and hydrate the exact result. Add a production-timezone E2E test.

**Done when:** there are no hydration warnings across UTC/Sydney date boundaries and the script date remains stable for the entire attempt.

### P1-02: make authenticated navigation work at phone width

At a 390px viewport the dashboard document measured approximately 488px wide. The sign-out control sat partially off-screen and the header produced horizontal scrolling. The marketing navigation behaved correctly at the same width.

**Required action:** add a compact authenticated mobile header or overflow menu, allow safe wrapping, and test dashboard, quiz, auth and legal pages at 320, 375, 390 and 430px. The Fred-style simulator may remain explicitly laptop-first, but every non-simulator account function must remain reachable.

### P1-03: isolate and persist quiz progress per account

A brand-new QA account displayed `100% best · 1 attempt` before taking a quiz. `QuizWorkspace.tsx` stores progress under one global localStorage key: `dispenserx-consultation-quiz-progress-v1`.

Consequences:

- people sharing a browser inherit each other's progress;
- sign-out does not isolate learning history;
- progress does not follow the student across devices;
- dashboard analytics do not include quiz learning.

**Required action:** store attempts under the authenticated user in Supabase, or at minimum namespace local storage by user ID and clear/migrate safely. Define whether quiz attempts count toward overall progress before implementation.

### P1-04: finish the voice delivery strategy

`npm run voice:check` reported **831 of 831 planned audio files missing**. The current fallbacks download a roughly 93MB Kokoro model in the browser and can fall back again to operating-system speech. The bundled voice labels are British rather than the intended authored/licensed Australian patient performances.

This is a graceful technical fallback, but it is not yet a refined voice product. First use can be slow, voice quality varies by device, and external model files are fetched from Hugging Face.

**Required action:** decide whether launch promises text consultation, synthetic voice or authored patient audio. If voice remains a headline feature, provide the approved assets or explicitly label it beta; test microphone permission denial, slow connections, offline failure, unsupported browsers and model-cache recovery. Update privacy disclosures for external model downloads where applicable.

### P1-05: add automated browser, accessibility and production checks

The repository has useful unit coverage, but no Playwright/Cypress E2E suite, automated accessibility checks, Lighthouse budgets, GitHub Actions workflow or branch protection. GitHub currently relies on the Vercel status only.

Minimum pre-launch suite:

- sign-up, sign-in, sign-out and password-reset callback;
- dashboard entitlement states;
- Case 1 guided tutorial from prescription to result;
- a non-assembly case;
- patient/prescriber/medicine directories and overlapping draggable dialogs;
- assembly pack choice, every carton face, label placement/rotation/removal;
- text and voice consultation fallbacks;
- quiz isolation by user;
- checkout, webhook and billing portal in Stripe test mode;
- anonymous/student/admin RLS matrix;
- axe checks on every route and keyboard-only critical paths;
- production smoke checks for `/`, `/api/health`, auth, dashboard, practice and quiz.

Require lint, unit, build, E2E and migration/RLS checks before merge to `main`, and protect `main` from direct unverified pushes.

### P1-06: repair sitemap URL construction and finish SEO setup

Production `robots.txt` advertises `https://bloo-seven.vercel.app//sitemap.xml`, and sitemap entries after the home page contain double slashes such as `//privacy`. The configured site URL includes a trailing slash while the sitemap concatenates another slash.

**Required action:** normalise the base URL once, add URL-generation tests, resubmit the corrected sitemap and verify canonical/robots output on the final custom domain. Use `lang="en-AU"` rather than generic `en` if Australian English is the intended locale.

### P1-07: improve release monitoring and recovery

There is no error-reporting service, product analytics, uptime monitor or documented alert path. A broken checkout, hydration error or Supabase policy drift can therefore reach users without an operator being notified.

**Required action:** add privacy-conscious error monitoring and structured server logs, alerts for health/checkout/webhook failures, deployment annotations and a rollback runbook. Track only the events necessary to understand onboarding, case completion and failures; document the analytics processor and consent basis.

### P1-08: complete keyboard access for physical label placement

The Case 1 workbench correctly offers pointer drag, click-to-place, face controls and rotation buttons. However, the sticker tray and placed stickers use `role="button"`/`tabIndex` without keyboard activation handlers, while the clickable carton face is not exposed as an equivalent keyboard target. A keyboard-only student cannot complete the same assessed placement task.

**Required action:** support Enter/Space to select a sticker, keyboard selection of a panel and position, arrow-key movement with announced coordinates, rotation, removal and focus restoration. If exact placement cannot be made accessible, provide an equivalent assessed interaction rather than exempting the workflow.

### P1-09: remove the brief false-empty state in live directories

During patient search, “No patients found” briefly appeared before matching Smith records loaded. This makes a healthy directory look broken on a slower query.

**Required action:** show an explicit loading row/skeleton after the debounce begins, announce result count when complete and show the empty message only after the request settles.

## Product and experience audit

### Marketing site

**What works well**

- Strong Australian pharmacy-student positioning and clear visual hierarchy.
- Real simulator imagery is more credible than generic stock artwork.
- Honest launch-readiness messaging and clear differentiation between practice and exam-style modes.
- The marketing header and menu remain usable at 390px.
- Privacy, terms and support routes exist and are linked.

**What needs refinement**

- The two large hero PNGs are about 1.32MB and 1.13MB. On production they appeared blank initially and rendered roughly 2.5 seconds later. Convert to responsive WebP/AVIF, provide accurate intrinsic sizes and meaningful placeholders, and set a performance budget.
- The desktop hero is very tall; the primary CTA can sit below a 900px first viewport. Tighten the headline/spacing or keep a CTA visible beside the lead copy.
- “Annual · save” is vague. State the exact saving, for example “2 months free”, after commercial approval.
- Paid pricing controls are visible even though paid launch is deliberately closed. A waitlist or disabled launch-state control is clearer than allowing a predictable error.
- The first simulator screenshot foregrounds a failed critical safety gate. That demonstrates rigor, but the hero should also show successful progress or completion so the emotional first impression is not exclusively failure.
- “No software to install” is technically true, but a first voice session may download a large model. Set expectations for slower connections.

### Authentication and account flows

**What works well**

- Sign-in/sign-up forms use visible labels, useful validation, autocomplete attributes, password reveal controls and accessible error regions.
- Protected routes correctly redirect anonymous visitors to sign-in.
- The invalid password-reset state is understandable and links to support.

**What needs refinement**

- Sign-in, sign-up, forgot-password and update-password inherit the generic marketing home title rather than route-specific metadata.
- The invalid update-password state has no page-level `h1`.
- The live sign-in redirect was noticeably slow during the audit; add loading feedback and measure auth callback latency.
- Study-stage metadata cannot be retained until the live schema/trigger is upgraded.
- Complete a real email-delivery test for confirmation and password reset using the production sender/domain.

### Dashboard

**What works well**

- Clear progress summary, case cards and direct routes into practice and learning tools.
- Entitlement messaging distinguishes free and full access.

**What needs refinement**

- Mobile header overflow must be fixed.
- Quiz progress is disconnected from the account/dashboard.
- Billing state is not trustworthy until schema and webhook reconciliation are operational.
- Provide a visible account/settings area for profile correction, subscription management, privacy requests and account deletion.

### Fred-style dispensing simulator

**What works well**

- The layout preserves the Fred Dispense teaching model rather than replacing it with a generic form.
- Prescription, patient, prescriber and medicine panels can remain open together; draggable dialogs support cross-reference during selection.
- The prescription is realistic, remains available throughout the task and includes zoom/reset controls.
- Warning selection is clearer than the earlier compressed implementation.
- Required-item guidance, final-decision options and feedback are easy to understand.
- The training-only banner and case controls avoid pretending this is production dispensing software.

**What needs refinement**

- Fix the hydration mismatch and loading feedback noted above.
- Validate full keyboard operation and focus order across draggable dialogs, directories and warning selection.
- Test at common laptop heights such as 720px and 768px, not only wide high-resolution screens; the dense Fred layout needs predictable internal scrolling and no hidden submit controls.
- Avoid introducing more visual override layers in `simulator.css`; consolidate its repeated sections before the next major redesign.
- Define a stable modal/window stacking policy and add E2E coverage for prescription plus each directory combination.

### Guided tutorial

The 18-step tutorial is one of the strongest parts of the product. It was exercised through prescription viewing, patient search/selection and transition to prescriber selection. Spotlight boxes, arrows, required clicks and explanatory copy make the workflow understandable without abandoning the Fred layout. Its declared scope continues through medicine entry, label, initials, decision, workbench, warning rotation, consultation and results.

Refinements:

- The generic first-visit onboarding flag is stored for the browser rather than the account. On shared university computers a new student may inherit another person's “already seen” state. Namespace it by account or store it in the profile.
- Add “restart this step”, “restart tutorial” and a persistent progress label such as “4 of 18”.
- Verify every step at 1366×768 and with 200% zoom so arrows never point outside the visible area.
- Keep the tutorial case separate from scored progress and label any assisted result clearly.

### Physical-pack workbench

**What works well**

- The Case 1 carton is again convincingly 2.5D, with visible depth rather than a flat card.
- Students can inspect front, right, back, left, top and bottom faces.
- Dispensing and colour-coded warning labels resemble physical sticker stock.
- Labels can be placed on different faces, moved, removed and rotated in 15° or 90° increments.
- The medicine reference book is available within the stage.
- Placement warnings correctly teach students not to cover medicine name, strength, form, barcode, batch, expiry or openings.

**What needs refinement**

- It remains explicitly “Case 1 prototype”. Case 2 and the other cases use the older warning-label flow, so the experience changes after the first case. This is acceptable for a clearly labelled beta but not for a claim that every case reproduces physical assembly.
- Add keyboard-equivalent placement and automated collision/occlusion tests.
- Define how label scale maps to real pack dimensions across bottle, box, inhaler and liquid packaging before expanding beyond cartons.
- Confirm placement marking with an educator: acceptable faces, overlaps, opening clearance, label order and partial occlusion need explicit rules and tolerances.
- Preserve the current 2.5D depth and face proportions with screenshot regression tests; this area has already regressed visually during iteration.

### Patient consultation

**What works well**

- Text mode provides a robust fallback when microphone or speech assets fail.
- Structured patient turns, scoring and safety feedback create a more realistic post-dispense stage than a multiple-choice-only exercise.
- The interface exposes interaction method and system status.

**What needs refinement**

- Complete the voice strategy and clinical review described above.
- Test interruption, repeated questions, silence, microphone denial, model-fetch failure, lost connection and unsupported browser behavior.
- Explain to the student what is processed locally and what is downloaded or transmitted.
- Add a way to report a clinically incorrect or unnatural patient response with the case/version attached.

### Consultation quiz

**What works well**

- Ten themed sets create a useful standalone learning tool.
- Question explanations and the medicine book make feedback more educational than a simple right/wrong result.
- The interface is visually consistent with the rest of the application.

**What needs refinement**

- Fix cross-user local progress and connect results to the account.
- Complete pharmacist educator review of every item and medicine profile.
- Add item versioning to stored attempts so later content corrections do not make old scores misleading.
- Measure and review question quality: ambiguity reports, distractor performance and items with unexpectedly high failure rates.

## Accessibility and responsive design

The product contains good foundations: semantic buttons, labelled inputs, `aria-live` errors/status, dialog roles and visible focus styling appear throughout. It is not yet possible to claim accessibility conformance because no automated or manual WCAG audit exists and the workbench has a known keyboard gap.

Before launch:

- target WCAG 2.2 AA for marketing, auth, dashboard, quiz and all non-spatial simulator operations;
- run axe and manual screen-reader checks with NVDA/Chrome and VoiceOver/Safari;
- complete every workflow using keyboard only;
- test 200% and 400% zoom, high contrast, reduced motion and browser text scaling;
- ensure draggable dialogs never require dragging and always remain recoverable on-screen;
- verify colour-coded warning labels also communicate meaning through number/text, not colour alone;
- document the laptop-first minimum viewport for the Fred simulator while keeping account/support functions phone-accessible.

## Performance and dependency health

### Current observations

- `public/` is approximately 110MB.
- Several self-hosted ONNX Runtime WASM files are between roughly 10MB and 25MB each.
- The browser voice fallback may fetch an additional model of roughly 93MB.
- Production hero screenshots have a visible loading delay.
- The practice route is the heaviest application route in the current build.
- `npm audit --omit=dev` found zero production vulnerabilities.
- The full audit found one high-severity development-only transitive issue in `brace-expansion`, with a fix available.

### Required action

- Confirm which WASM variants are actually required and stop shipping unused variants.
- Lazy-load speech/semantic tooling only when the student enters a feature that needs it.
- Add explicit download/progress/error UI for large optional models.
- Optimise marketing images and set route/image performance budgets.
- Resolve the development dependency advisory without forcing unrelated major upgrades immediately before launch.
- Schedule controlled dependency updates with regression tests; do not blanket-upgrade Next/React/Supabase as a release-day task.

## Repository and maintainability

### Verified quality checks

- `npm run lint` - passed.
- `npm test -- --run` - 14 test files and 184 tests passed.
- `npm run build` - passed.
- `npm audit --omit=dev` - zero production advisories.
- Production `/api/health` - returned 200 with no-store behavior.

### Risks to address

- There is no GitHub Actions workflow or branch protection; a passing local run is not an enforced merge condition.
- Two different migration files use the `0011` prefix.
- `README.md` still points to `.env.local.example`, documents only the basic Supabase setup, refers to an outdated migration sequence and describes the project as an earlier phase.
- `.env.example` and `.env.local.example` overlap but differ, increasing configuration mistakes.
- Standalone setup SQL can restore unsafe anonymous policies.
- Database types are hand-maintained instead of generated from the deployed project.
- Several files are very large: `simulator.css` is over 5,000 lines; conversation cases, references, quiz cases, static cases, the practice page and assembly component are all large modules. Layered override comments in the simulator CSS make regressions increasingly likely.
- There is no error monitoring, analytics, E2E suite, visual regression suite or documented release/rollback checklist.

Refactor only after the blockers are secured. Split by stable domain boundaries, add characterization tests first and avoid changing the Fred workflow while reorganising code.

## Security and privacy hardening beyond the blockers

- Good headers are present on production: HSTS, frame denial, MIME sniffing protection, referrer and permissions policies, COOP and COEP.
- A Content Security Policy is absent. Introduce a report-only CSP first, account for Supabase, Stripe, required workers/models and then enforce it.
- COOP/COEP is applied globally even though local ML/WASM features are the likely reason for isolation. Scope or carefully test these headers so future payment, support or analytics integrations are not unexpectedly blocked.
- Review whether Hugging Face/model delivery must be named in the privacy policy and processor inventory.
- Add rate limits and abuse controls to auth, checkout and any writable application endpoints.
- Configure dependency and secret scanning, and rotate credentials under a documented process. No secret value was included in this report.

## Launch plan

### Phase 0: contain current exposure

- [ ] Disable/hide paid purchase controls or redirect to a waitlist.
- [ ] Back up Supabase.
- [ ] Apply the RLS and entitlement protections.
- [ ] Verify anonymous and student negative-permission tests.
- [ ] Confirm no untrusted directory mutations remain.

### Phase 1: make staging match the intended architecture

- [ ] Create or refresh a staging Supabase project.
- [ ] Renumber/order migrations and apply the complete chain from empty database to current schema.
- [ ] Generate current database types.
- [ ] Exercise sign-up, profile creation, study stage, attempts and every directory.
- [ ] Fix hydration, quiz storage and mobile authenticated navigation.
- [ ] Add CI with lint, unit, build, migration/RLS and core E2E tests.

### Phase 2: complete product and governance readiness

- [ ] Complete pharmacist and jurisdiction/legal review for the exact content release.
- [ ] Configure support and verified operator/legal details.
- [ ] Decide and deliver the launch voice scope.
- [ ] Complete workbench keyboard access and educator-approved placement rules.
- [ ] Correct sitemap/canonical generation and move to the intended custom domain.
- [ ] Add monitoring, alerting, feedback and incident procedures.

### Phase 3: validate billing and release operations

- [ ] Apply billing schema and secrets in staging.
- [ ] Test checkout, duplicate/out-of-order webhooks, portal, renewals and cancellations.
- [ ] Test recovery when Stripe succeeds but the application update fails.
- [ ] Apply the verified migration set to production during a controlled window.
- [ ] Run production smoke, RLS, auth and Stripe tests.
- [ ] Confirm rollback owner, database recovery point and customer communication template.
- [ ] Set `PAID_LAUNCH_APPROVED=true` only after every hard gate is evidenced.

### Phase 4: controlled release

- [ ] Start with a small invited cohort and visible beta label.
- [ ] Watch sign-in, case-start, completion, checkout, webhook and error metrics.
- [ ] Review support and clinical-correction reports daily during the initial cohort.
- [ ] Expand only after a stable observation period and written go/no-go review.

## Final go-live acceptance checklist

Release is ready only when all of the following are true:

- [ ] Anonymous users cannot read or mutate protected training directories.
- [ ] Students cannot change paid/admin/trial or Stripe fields.
- [ ] Live schema exactly matches the reviewed migration set.
- [ ] All 13 launch cases and associated learning content have traceable clinical/legal approval.
- [ ] Support, operator, privacy, terms, refund and cancellation information is correct and tested.
- [ ] Paid buttons, checkout, webhook idempotency, portal, renewal and cancellation pass live-mode validation.
- [ ] No hydration errors or uncaught console errors occur in production smoke tests.
- [ ] Authenticated navigation works at phone widths; simulator works at its documented laptop minimum.
- [ ] Quiz/onboarding progress is isolated per account.
- [ ] Critical workflows are keyboard accessible or provide an equivalent accessible interaction.
- [ ] Voice scope is honest, reliable and privacy-documented.
- [ ] CI, protected main, E2E, accessibility, performance and RLS checks are enforced.
- [ ] Monitoring, alert ownership, rollback and incident processes are active.
- [ ] Correct sitemap/canonical URLs and a suitable production domain are live.

## What is already strong

This is not a recommendation to rebuild the product. The Fred-style dispensing layout, persistent realistic prescription, overlapping reference panels, guided tutorial, staged consultation, honest safety feedback and Case 1 2.5D assembly concept are meaningful differentiators. The source also contains thoughtful paid-launch gates and better-than-average unit coverage. The correct next step is to secure and align the live system, finish professional review and add release assurance around the product that already exists.

## Audit method and limitations

The audit combined repository inspection, git/release inspection, local production build, lint/unit/security checks, authenticated and anonymous production browsing, responsive screenshots, console/network observation and isolated Supabase permission probes. Test data was uniquely marked and removed; the temporary QA auth user, profile and attempt rows were deleted and verified absent at the end of the audit. No real customer data was altered.

Not performed:

- no real card was charged;
- no production password-reset or confirmation email was delivered;
- no external pharmacist or lawyer performed a content review;
- no microphone permission or full model download was exercised;
- no destructive migration was applied;
- no application or production configuration was changed as part of the audit.

Findings describe the production and repository state observed on 2 August 2026 and should be revalidated after every remediation or deployment.
