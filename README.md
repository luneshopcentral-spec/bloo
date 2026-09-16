# DispenseRx Practice

An independent study app for Australian pharmacy students, with dispensing, pack assembly, consultation practice, quizzes and progress tracking. Not affiliated with Fred IT Group Pty Ltd. Training examples are fictional and are not clinical instructions for real patients.

## Release status

Launch fixes are implemented locally. Production database upgrades, clinical and jurisdiction review, operator details and live billing/email checks remain required. Read [the implementation report](docs/launch-fixes-2026-09-16.md), [the original audit](docs/launch-audit-2026-09-15.md) and [the paid launch checklist](docs/launch-readiness.md).

Keep `PAID_LAUNCH_APPROVED=false` until the checklist is complete. The server also checks content approval, billing configuration and database readiness before accepting checkout.

## Local setup

Use Node.js 22 and npm. On Windows PowerShell, use `npm.cmd` if the script execution policy blocks `npm`.

```sh
npm ci
```

Copy `.env.example` to `.env.local`. Configure the Supabase project URL, public anon key and server-only service role key. Never commit credentials or expose the service role key through a `NEXT_PUBLIC_` variable. The remaining operator and Stripe variables are documented in the template.

### Database

- **New database:** apply every SQL file in `supabase/migrations/` in filename order, once. Then seed the patient and medicine directories with the commands below.
- **Existing database with 0001–0005:** back up first, then apply `supabase/setup_release_hardening.sql` as one transaction in the Supabase SQL Editor. This bundle includes the later migrations and can be reapplied.
- The former duplicate `0011_remove_anon_directory_access.sql` is now `0015_remove_anon_directory_access.sql`. Check the remote migration ledger before using `supabase db push`; the manual upgrade bundle does not reconcile that ledger.
- Confirm `select public.launch_schema_ready();` returns `true` as an administrator. The application health route must return HTTP 200 after deployment.

```sh
npm run seed:patients
npm run seed:drugs
npm run dev
```

In Supabase Auth, configure the production site URL and permitted callback URLs for local and production hosts, including `http://localhost:3000/auth/callback`. Test confirmation and password-reset email delivery using real mailboxes.

## Verification

```sh
npm run lint
npm test -- --run
npm audit --audit-level=moderate
npm run build
npm run start
```

Database tests require `psql` and a **new, isolated PostgreSQL database named `launch_audit`**, with an administrator connection in `TEST_DATABASE_URL`. They emulate Supabase roles/auth and apply the entire migration chain, then check the access boundaries. Never target a customer database. Set `PSQL_PATH` if `psql` is outside PATH.

```sh
node scripts/test-database.mjs
```

`.github/workflows/verify.yml` runs application checks and an isolated PostgreSQL test job on pushes and pull requests.

## How progress is stored

- The server creates a practice session and grades raw submissions. Client-provided numeric scores are not trusted. One session produces one idempotent saved attempt.
- Learn/reveal attempts are assisted. Existing unverified attempts remain stored but are excluded from verified dashboard progress. Dashboard summaries explicitly cover the latest 100 verified attempts.
- Device drafts and failed submissions are scoped to the signed-in account. A student can resume a practice draft or retry a queued save. Local storage is a convenience, not a backup.
- Quiz answers are graded by the server and persisted per account/content version. Offline results are queued on that device. Quiz progress is separate from simulator competency summaries.
- `/account` supports profile edits, password-reset requests, JSON data export, billing portal access and support/deletion requests. Deletion requests require operator handling; they do not immediately delete an account.
- `/admin` is restricted to a server-checked `profiles.role='admin'` and lists feedback plus content-review status. Assign that role only using a trusted administrative connection.

## Voice and content

Text consultation is the default. Voice is experimental: browser speech recognition can send audio to the browser provider. Local Kokoro speech generation requires a sizeable first download, and a system voice is the fallback. Do not enter real patient details.

Recorded speech is disabled by default because reviewed recordings have not been installed. `npm run voice:manifest` lists the required assets; `npm run voice:check` detects missing files. Enable `NEXT_PUBLIC_RECORDED_VOICE_ENABLED` only after licensed, reviewed recordings pass that check. The clinical and legal review register in `src/lib/governance/editorial.ts` must contain genuine approvals before paid release.

The browser receives training case content. This is a practice tool, not a secure proctored examination system. Automated rule-based consultation grading does not replace educator judgement.

## Operations

`/api/health` checks database schema and selected access boundaries. Attach an external monitor and alerts before launch. Server request failures emit structured route/error references without submission text; configure retention and an appropriate monitoring destination. Rebuild after changing public environment values.

See the implementation report for deployment order, rollback precautions and outstanding live verification.
