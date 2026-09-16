# Paid launch readiness

Production checkout is deliberately fail-closed. `PAID_LAUNCH_APPROVED=true` is
required in addition to a production URL, monitored support email and completed
case-review records. Leave it false until every item below is evidenced.

## Automated repository checks

- [x] Checkout refuses missing customer profiles and invalid plan IDs.
- [x] Checkout retrieves the configured Stripe Price and refuses to proceed if
  its active state, AUD amount or recurring interval differs from the published
  plan.
- [x] Webhooks verify signatures, log delivery attempts and return `500` after
  entitlement or logging failures so Stripe retries.
- [x] Subscription ID, Stripe customer ID, plan, status, period start/end and
  cancellation state are stored.
- [x] Automated tests cover payment success, cancellation, failed/past-due
  payment, database failure, retry and duplicate delivery.
- [x] Legal, refund, privacy and support routes are linked from the relevant
  customer surfaces.
- [x] `/api/health` provides a no-cache target for an external uptime monitor.

## Operator and legal details

- [ ] Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS production origin.
- [ ] Set `NEXT_PUBLIC_SUPPORT_EMAIL` to a monitored inbox and test inbound and
  outbound delivery. The beta response target is two business days.
- [ ] Set `NEXT_PUBLIC_LEGAL_BUSINESS_NAME` to the correct operator identity.
- [ ] Confirm the GST setting and displayed prices with an Australian tax/legal
  professional, then set `NEXT_PUBLIC_PRICES_INCLUDE_GST` accurately.
- [ ] Have the Privacy Policy, Terms and Refund/Cancellation Policy reviewed for
  the actual operator, service and jurisdiction.
- [ ] Document the account data-access, correction, export and deletion process,
  including the person responsible and evidence-retention rules.

## Content governance

- [ ] Record a permitted pharmacist reviewer name, qualification and review date
  for every case in `src/lib/governance/editorial.ts`.
- [ ] Record the Victorian jurisdiction/legal reviewer and review date for every
  case.
- [ ] Recheck every versioned source and define the next review date or trigger.
- [ ] Do not publish student quotes, reviewer credentials, pilot logos or
  institutional endorsements without written permission.

## Supabase and Stripe live-mode test

- [ ] Back up the database and apply all migrations through `0017_launch_health.sql`.
  Existing databases with 0001–0005 can use `supabase/setup_release_hardening.sql`.
  Reconcile the former duplicate 0011 migration with the remote ledger before CLI pushes.
- [ ] Confirm `launch_schema_ready()` is true, `/api/health` returns 200, ordinary
  students cannot edit entitlements or insert attempts, and a real authenticated
  practice and quiz completion can be saved and reloaded.
- [ ] Confirm `STRIPE_PRICE_ID_MONTHLY` is A$13/month and
  `STRIPE_PRICE_ID_YEARLY` is A$130/year (plus the configured tax treatment).
- [ ] Configure the production webhook for `/api/stripe/webhook` and subscribe
  to checkout completion, subscription lifecycle, invoice paid and invoice
  payment-failed events.
- [ ] Complete a controlled live purchase for both plans and confirm the account
  unlocks, the period window is correct and the receipt arrives.
- [ ] Cancel one subscription in the customer portal and confirm access remains
  until period end, then is revoked after the deletion/end event.
- [ ] Force one entitlement database update to fail, confirm Stripe receives a
  `500`, then restore the database and confirm the same event succeeds on retry
  with its attempt count incremented.
- [ ] Test a failed payment and past-due state and confirm paid access is revoked
  according to the documented policy.
- [ ] Verify portal cancellation, payment-method updates, receipts, billing
  emails and accepted payment methods in the live Stripe account.
- [ ] Test simultaneous checkout clicks, repeated webhook delivery, out-of-order
  subscription events and replacement subscriptions against the actual Stripe account.

## Email, support and operations

- [ ] Test confirmation, resend and password-reset messages with at least two
  external mailbox providers; verify expired and already-used links.
- [ ] Configure SPF, DKIM and DMARC for the sending domain and review aggregate
  DMARC reports.
- [ ] Connect an uptime service to `/api/health` and alert the named operator.
- [ ] Configure server/client error monitoring without sending passwords,
  patient-like free text or payment details to the monitoring provider.
- [ ] Run a documented keyboard-only and screen-reader check over marketing,
  sign-up, confirmation, sign-in, checkout result and billing states.

## Funnel measurement

- [ ] Choose the minimum useful funnel events: CTA source, sign-up completion,
  first case opened and first case completed.
- [ ] Prefer aggregated first-party or privacy-preserving measurement; do not
  collect counselling text, prescription data or fingerprinting attributes.
- [ ] Update the Privacy Policy with the selected provider, event data,
  retention, overseas processing and opt-out/consent treatment before enabling
  tracking.

When all evidence is retained, set `PAID_LAUNCH_APPROVED=true`, deploy, and run
one final controlled live checkout. If any assumption changes, return the switch
to false while the affected check is repeated.
