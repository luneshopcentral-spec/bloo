# Student pilot readiness — 22 September 2026

## Release status

The student access-code flow is deployed and verified against production. The
engineering checks support a small, structured laptop-based pilot after the
owner checks below. They do not establish clinical approval or paid-launch
readiness. No new database migrations are required for these changes.

Application release checked: `2a41f4472de25c717b8a34073917395cbf39bcfe`.
Production: <https://www.dispenserx.au>.

## Where students enter their code

1. Create an account and confirm their email if prompted.
2. Sign in and open <https://www.dispenserx.au/dashboard#access-code>.
3. Enter the code in **Student access code** and choose **Unlock access**.
4. Open the simulator, complete the guided tutorial, then try an independent
   **Practice** case. Learn/tutorial results do not count as independent attempts.
5. Report issues at <https://www.dispenserx.au/account#report>. Include the case,
   exact question or action, expected result, and actual result. Use fictional
   patient details only.

Codes also remain available on the Account page. These codes provide timed
access without a card, subscription, or payment. Stripe discount codes are a
different feature: they are entered in Stripe Checkout using **Add promotion
code**, once checkout configuration is working.

## Completed

- Prominent dashboard code entry, immediate expiry/success feedback, a clear
  route into practice, and guidance for the student's first session.
- Clear distinction between subscription access and temporary code access.
- Admin **Copy invite** produces joining instructions with the code, duration,
  redemption deadline and email restriction when applicable. Copying does not
  send an invitation; the owner distributes it.
- Safer redemption errors: invalid/expired/used codes remain actionable;
  infrastructure failures do not disclose database details or appear as invalid
  codes. Malformed successful responses are rejected.
- Sign-in, sign-up and confirmation-resend network failures release the loading
  state and show a recoverable error.
- Earlier tutorial/conversation improvements remain included. See
  [the tutorial release notes](tutorial-conversation-hardening-2026-09-19.md).
  The dispensing form layout is preserved.

## Verification evidence

- **341 automated tests across 25 files passed**; lint passed.
- GitHub Actions run `35602938421` passed application and database jobs for the
  application release, including production build and database security checks.
- Vercel production deployment `6568986696` succeeded. The authenticated public
  dashboard served the new code entry and first-session guide.
- A restricted, disposable code was tested with a synthetic student against
  production: a locked case returned 403 before redemption, redemption returned
  200, repeat redemption returned 400, and the dashboard displayed the grant.
- Actual production Practice and Learn submissions saved server-verified,
  passing results. Practice counted toward independent progress; Learn did not.
  Retrying each submission returned success with exactly one stored result.
- The temporary QA code, redemption, sessions and attempts were removed, and
  the synthetic student's original access grant was restored.
- Local authenticated dashboard checks at laptop size found and fixed contrast
  and heading issues; the subsequent scoped axe scan reported zero violations.
- Feedback navigation and success UI were checked with an intercepted response.
  This did **not** verify end-to-end report delivery to the admin portal.
- The synthetic account was already confirmed. These tests do **not** prove
  confirmation/password-reset email delivery to real student inboxes.

## Remaining before inviting the group

| Owner action | Completion evidence |
| --- | --- |
| Create the cohort code in Admin → Access codes. Choose duration, maximum redemptions and redemption deadline. | Copy invite contains the intended code and public dashboard URL. No code was created for the cohort by this task. |
| Run one real student's sign-up and recovery flow before sending the whole batch. | Confirmation/resend and password-reset messages arrive; links work; the student can sign in and redeem the code. Check Supabase email configuration and rate limits if delivery is slow or blocked. |
| Review the pilot's cases and marking with the supervising pharmacist/educator. | Agree which cases students should use and how to escalate disputed clinical feedback. Current case/rubric records remain draft; do not present scores as certification. |
| Submit one clearly labelled pilot feedback report and verify it in Admin. | A named operator can find, review and respond to reports; students know the support route. This task did not send a report or messages to other people. |
| Send the copied invitation and pilot instructions yourself. | Students know to use a laptop, start with the tutorial, use fictional data and report misunderstood wording. |

## Stripe sandbox — separate from free student access

Fresh production checks on 22 September still returned:

| Plan | Current result | Required setup |
| --- | --- | --- |
| Monthly | Redirects to `dashboard?checkout=terms`. | Configure the Stripe public terms URL as `https://www.dispenserx.au/terms` and privacy URL as `https://www.dispenserx.au/privacy`. The inspected Stripe public-details link led to a business setup requirement; the owner must supply the actual business details. Terms consent remains enabled. |
| Yearly | Redirects to `dashboard?checkout=price`. | Select/create an active sandbox recurring price for **AUD 130 per year**, set Vercel `STRIPE_PRICE_ID_YEARLY` to that price, and redeploy. |

After correcting both, complete actual sandbox checkout for each plan and verify
webhook delivery, entitlement updates, customer-portal cancellation, expiry,
failed-payment handling and duplicate-event behavior. Automated coverage is not
proof of the deployed Stripe configuration. No payment was taken during these
checks and no Stripe account settings were changed.

Before accepting real payments, complete the separate
[paid-launch checklist](launch-readiness.md), including clinical/legal review,
operator/support details and real payment lifecycle evidence. Keep the paid
launch approval gate closed until that work is complete.

## Improve during the pilot

- Collect misunderstood questions with their case and preceding conversation,
  then add targeted interpretation rules and regression tests. The current
  engine is case-grounded and does not understand arbitrary phrasing reliably.
- Review tutorial abandonment, confusing steps, disputed scores and repeat
  support reports before expanding the group.
- Broaden keyboard/screen-reader checks beyond the tested screens. The scoped
  accessibility scan is not a full accessibility audit.
- Speech recognition and text-to-speech redesign remain deferred as requested.

