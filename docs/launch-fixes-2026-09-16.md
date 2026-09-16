# Launch fixes and release handoff

## Status

Updated 16 September 2026. Work is on `codex/launch-hardening`, based on the up-to-date pulled repository at `fc848d0`. Changes are local and uncommitted; no application deployment or live database migration has been performed.

The first dispensing stage retains its form structure. Changes concentrate on trustworthy scoring and saving, access controls, later simulator stages, account tools, responsive layout and release operations.

**Paid launch remains closed.** Code fixes alone cannot supply the missing operator configuration, clinical/jurisdiction approvals, production migration access or evidence of real payment/email delivery.

## Implemented

| Area | Result |
|---|---|
| Database security | Students can update personal profile fields but not paid access, role or trial counters. Direct attempt insertion and directory modification are blocked. Anonymous directory access is removed. |
| Assessment | Server-owned sessions and server grading replace trusted browser scores. Repeat submission is idempotent. Unsafe near-match directions are rejected, script date/type and patient details are checked, and competency counts accumulate across all items. |
| Case consistency | Prescription variants keep the authored date; patient history uses proper date ordering and shared fallback seed data. Older unverified results remain stored but do not inflate verified progress. |
| Recovery | Account-scoped practice drafts restore form, patient, assembly and consultation state. Failed result saves remain queued with a retry action. Quiz results sync to the account with retry support and paginated history. |
| Assembly and consultation | Keyboard label placement/movement/rotation, clearer controls and type, correct selected-product pack text, removal of fake registration details, and hold/no-supply consultation instructions. Text mode remains usable while local models load. |
| Responsive UI | Mobile navigation and dashboard overflow fixed, homepage hierarchy tightened, nested main landmarks removed, and quiz contrast improved. |
| Account and support | Profile editing, password reset, billing portal, own-data JSON export, issue/deletion requests and an admin-only review/report screen. Deletion and report resolution remain operator workflows. |
| Billing | Serialized billing operations, reuse of existing checkout sessions, Stripe customer idempotency, existing-subscription handling, current invoice parent support, and reconciliation against current subscriptions so old events cannot revoke a replacement. |
| Launch controls | Checkout requires content approval, operator configuration, server release switch and a hardened database. Public purchase controls reflect availability. Explicit test billing accepts test keys only. |
| Operations | Dependency updates, enforced security headers, schema-aware health check, structured server error references, migration/security harness and CI configuration. |
| Voice | Missing recorded assets are disabled by default. Browser speech privacy and experimental status are disclosed; local/system speech fallback remains available. |

## Verification evidence

- ESLint passes.
- 209 unit/API tests across 17 files pass, including dangerous direction variants, rotated label submissions, attempt ownership, server grading, webhook retries and replacement-subscription ordering.
- Production build succeeds for 30 routes.
- Dependency audit reports zero known vulnerabilities, including development dependencies, at the time of this check.
- A fresh isolated PostgreSQL 18 database passed the full migration chain and negative access tests. These check cross-user profile isolation, entitlement/role escalation, forged attempts, directory poisoning, anonymous reads, billing lock ownership and request limits. The existing-database upgrade bundle was reapplied successfully; `launch_schema_ready()` returns true there.
- Browser checks used real Supabase authentication for the dedicated test student. Mobile dashboard width is 390px at a 390px viewport (previously 488px). Account UI and practice draft recovery were exercised.
- Automated axe WCAG A/AA scans found no violations on the checked desktop homepage, mobile dashboard and restored assembly state. This is a bounded automated check, not a full accessibility certification.
- Later-stage browser checks used explicit local API stubs because the live schema is missing the required migrations. Keyboard assembly, consultation completion and forced-save-failure recovery were exercised. These are UI checks, not proof of live end-to-end persistence.
- The test student account exists; credentials are only in ignored `output/playwright/launch-audit-account.private.json`. It is a free student account using a non-deliverable test address, so it cannot validate real email delivery.

Screenshots and local test output are under ignored `output/`. GitHub CI is configured but has not run remotely for these uncommitted changes.

## Required release sequence

1. **Database access and backup:** obtain an administrative SQL connection or use the Supabase SQL Editor. Existing service-role REST credentials cannot apply migrations. Preserve a backup and record the migration ledger. Apply `supabase/setup_release_hardening.sql` to the existing database after checking its 0001–0005 baseline. The former duplicate anonymous-access migration now has version 0015; do not blindly push a mismatched CLI ledger.
2. **Verify access boundaries:** require `launch_schema_ready()` to return true and repeat student-role security probes. Review existing paid flags and historical attempts: previously editable entitlements need reconciliation against actual Stripe records; the migration cannot establish which old paid flags were legitimate.
3. **Configure the operator:** supply canonical HTTPS origin, legal business name, monitored support address, appropriate tax setting, Supabase redirect URLs, email sender configuration, Stripe prices/secrets and webhook endpoint. Rebuild public configuration. Keep paid release disabled.
4. **Deploy and exercise real flows:** sign up, confirm, sign in/out, reset passwords, save/reload an unassisted practice attempt and quiz, resume a draft, retry a dropped connection, submit/handle a report and export the account. Test supported mobile/desktop browsers, keyboard and screen reader. The local checks do not certify every device or assistive technology.
5. **Review content and policies:** all 13 case versions are draft; 26 clinical/jurisdiction review approvals are missing. Complete genuine reviewer records and approved versions, review policies for the actual operator, and define ongoing review/retention ownership. Do not simply change flags to bypass this work.
6. **Prove billing and operations:** use test mode for lifecycle/failure tests, then controlled live purchases for both plans, portal cancellation, renewal/failure, refunds, webhook replay and replacement subscriptions. Verify receipts and support/email delivery. Set alerts on health and errors, and test a database restore.
7. **Open paid access:** only after retaining the evidence in `docs/launch-readiness.md`, set `PAID_LAUNCH_APPROVED=true`, deploy and verify the final checkout and entitlement path. Leave it false if any prerequisite is incomplete.

Deploy the database upgrade before the new app. Older browser builds that write attempts directly will stop saving after the security upgrade; use a maintenance window and require a reload. Do not restore insecure write grants as an application rollback. Keep checkout closed, preserve queued data and correct forward if a release fails.

## Remaining limits and next additions

- The live site still runs the older code/schema until release; the audit findings are not fixed in production yet.
- Case answers ship with browser training content. Server grading prevents stored-score forgery, but this is not a proctored exam or a guarantee against deliberate answer lookup.
- Rules-based counselling marking needs educator calibration against varied student phrasing. Model assistance in the browser is not authoritative clinical judgement.
- The 831 expected recordings have not been produced or reviewed. Text practice does not depend on them; recordings are optional for release while disabled. Real microphone permissions and speech recognition still need cross-browser testing.
- CSP currently allows inline scripts/styles for Next.js compatibility. A nonce-based policy can further tighten it after compatibility testing.
- Support reports and deletion requests need a named operator, retention policy and documented response process. The admin page lists reports; a richer assignment/resolution interface is a useful follow-up.
- High-value additions after the release gates: a case review/publishing workflow, educator-calibrated counselling examples, spaced revision based on missed competencies, learner-controlled study goals, and privacy-preserving completion analytics. Each should be scoped and validated separately.

The original findings and prioritisation are retained in [the launch audit](launch-audit-2026-09-15.md).
