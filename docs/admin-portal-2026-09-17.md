# Admin portal

## Delivered

The portal runs on the admin subdomain of the existing Next.js deployment. It has a separate login and host-scoped session. Every protected page checks the signed-in account's administrator role on the server. The primary website does not expose the `/admin` page tree.

- Overview: registered accounts, new registrations, paid and timed access, practice activity and open feedback.
- Registered users: email/name search, access filters and pagination; registration date, university, verified independent practice counts, pass rate and quiz activity. Individual accounts show email confirmation and last sign-in separately from learning activity.
- Account management: grant or revoke complimentary access, manage administrator roles and reset saved practice/quiz progress. Destructive actions require confirmation. An operator cannot demote themselves.
- Access codes: random or custom codes; duration in minutes, hours or days; optional redemption deadline, maximum uses, account email restriction and internal note. Codes can be copied, disabled and re-enabled. Each code has a paginated redemption history with account links.
- Admin activity: paginated operator/action/time/target records with expandable details.
- Feedback: open, in-progress and resolved workflow with reporter identity.
- Announcements: publish, hide, show and delete student banners.
- Content: case and quiz inventory and review status.
- Settings: maintenance controls and read-only paid-launch status. This does not override clinical/content approval or billing launch gates.

## Access rules

1. A code grants a duration measured from the moment the student redeems it on `/account`. Supported durations are 15 minutes through 365 days.
2. Existing longer access is retained. For example, redeeming a two-hour code while three days remain consumes that code but retains the three-day expiry. Grants do not stack extra time onto an existing expiry.
3. The redemption deadline controls when the code can be used. The student's access expiry is a separate timestamp.
4. A registered account can redeem a given code once. The maximum-use count applies across accounts. An optional email restriction is matched against the verified session's account email in Supabase Auth.
5. Disabling a code prevents future redemptions. It does not withdraw grants already issued. Use the account's **Revoke trial** action to remove its current complimentary access; paid subscriptions remain separate.
6. No scheduled job is needed to expire access. Server entitlement checks reject access after the timestamp. Times displayed in the portal and student account include the Sydney timezone; the deadline form accepts the operator browser's local time.
7. Code redemption and access changes lock the affected database rows. Redemption updates its grant, history and use counter in one transaction. Administrator access changes and their audit records also commit together, or roll back together. Other operational actions log on a best-effort basis and surface logging failures in server logs.

The audit log is service-only and unavailable to students. It is not an immutable external compliance archive. Resetting progress removes server practice/quiz records and resets trial usage; it does not remotely clear browser drafts.

## Deployment

The application changes are implemented locally. Production DNS, administrator assignment and production database upgrades have not been performed as part of this implementation.

1. Confirm the primary domain and the email of the first administrator.
2. Back up the database. Apply outstanding migrations in order through `0019_admin_access_workflows.sql`. For a database on 0001–0005, `supabase/setup_release_hardening.sql` now contains 0006–0019 in one transaction. Do not run the isolated test bootstrap against a real Supabase project. Reconcile the Supabase CLI ledger separately if using migrations managed by that CLI.
3. Set `NEXT_PUBLIC_SITE_URL=https://<primary-domain>` and `NEXT_PUBLIC_ADMIN_HOST=admin.<primary-domain>` on the existing deployment. The admin host value contains no scheme, port or path. Retain the server-only Supabase service-role key. Rebuild after changing public environment variables.
4. Add `admin.<primary-domain>` to the existing deployment's custom domains and configure the DNS record supplied by that hosting provider. Wait for HTTPS to become valid. No second application or shared cross-subdomain cookie is required.
5. Have the designated administrator register and confirm their email on the main website. Use a trusted Supabase SQL Editor connection to inspect the exact account before assigning its role:

```sql
-- Replace with the designated person's actual, confirmed email.
select id, email, email_confirmed_at
from auth.users
where lower(email) = lower('REPLACE_WITH_ADMIN_EMAIL');

-- Replace with the exact UUID returned above; only a confirmed account qualifies.
begin;
set local role postgres;
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and u.id = 'REPLACE_WITH_VERIFIED_ACCOUNT_UUID'::uuid
  and u.email_confirmed_at is not null
returning p.id, p.email, p.role;
commit;
```

6. Sign in at `https://admin.<primary-domain>/login` using that account's normal password. Password recovery uses the existing main-site recovery flow; then sign back into the admin host. Subsequent role grants are available through the portal and are audited.
7. Verify the live flow with a designated test student: create a short, single-use code, redeem it, check both expiry displays and the audit log, then revoke the grant. Confirm a non-admin account is denied and main-site `/admin` returns 404. Check email recovery through a real mailbox. Keep paid checkout closed until the separate launch checklist is complete.

For development, set `NEXT_PUBLIC_ADMIN_HOST=admin.localhost` and open `http://admin.localhost:3000/login`. Use the actual configured port. Browsers generally resolve `*.localhost` to loopback; if the local environment does not, add that hostname to its local hosts configuration.

## Verification and boundaries

Database validation uses an isolated PostgreSQL instance with simulated Supabase roles and applies the complete migration chain. `supabase/tests/admin.sql` covers timed grants, duplicate and exhausted codes, email restrictions, disabled and expired codes, non-shortening grants, effective expiry, self-demotion prevention, student privilege boundaries, reporting pagination and literal searches. It also forces an audit-write failure and confirms the associated access change rolls back. The upgrade bundle was reapplied successfully to the isolated database and the admin tests passed again.

Browser checks use the real local Next.js UI and APIs against a local auth/PostgREST fixture backed by the isolated PostgreSQL database. They do not prove production Supabase Auth, DNS, hosting or email delivery. The fixture is excluded from source control and is never production configuration; the production content security policy was not weakened for it.

Verified browser flows: administrator login and logout; denial of student login; main-site admin page/API rejection; create and redeem a two-hour restricted code; duplicate redemption rejection; manual grant; filtered user search; redemption history; audit entries; student feedback submission and resolution; announcement creation and hiding; maintenance persistence; and explicit failed-save handling. Eight portal sections, account detail and login were checked with axe for WCAG A/AA rules, with no violations remaining in the checked states. Laptop layouts were checked for horizontal page overflow.

Final application checks: 280 tests across 20 files passed; TypeScript, ESLint, `git diff --check` and the optimized production build passed. These local checks do not change the broader launch requirements in `docs/launch-readiness.md`.
