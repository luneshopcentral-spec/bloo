# Pre-pilot readiness checklist

Run this **once, yourself, on production**, before inviting a test group. It is an
authenticated smoke test — the automated suite and code audit cannot prove the
deployed database, email delivery, or real account behaviour. Work top to bottom;
do not invite anyone until every **Blocker** passes.

Legend: `[ ]` to do · **Blocker** = stop the pilot if it fails.

---

## 0. Environment & deploy (Blockers)

- [ ] **Latest `main` is deployed** to production (check the Vercel deployment matches the current commit).
- [ ] **Migration `0020_unmatched_utterances.sql` is applied** in Supabase. Until then the admin *Unrecognised wording* page shows "table unavailable" and capture silently no-ops. (0018/0019 are already live.)
- [ ] **`SUPABASE_SERVICE_ROLE_KEY`** is set in production (admin portal reads/writes need it).
- [ ] **Admin subdomain resolves**: `admin.<yourdomain>` loads the admin login (DNS record + `NEXT_PUBLIC_ADMIN_HOST` if used).
- [ ] At least **one account has `role = 'admin'`** in Supabase (`update profiles set role='admin' where email='you@…'`).
- [ ] **Paid launch stays CLOSED**: `PAID_LAUNCH_APPROVED` is not `true`. No real card should be chargeable during the pilot.

## 1. Admin portal — authenticated pass

Log in at `admin.<yourdomain>/login` with your admin account.

- [ ] A **non-admin** account signed in at the admin subdomain sees "Not authorised", **not** the portal. (Confirms the role gate, not just the login.)
- [ ] **Overview** loads with real counts (users, attempts, feedback) — no "Unavailable" cards.
- [ ] **Users**: search finds a real account; open one; the "Manage account" panel shows access state.
- [ ] **Grant by email**: paste a real test account's email → 30 days → *Grant access* → success message names the account.
- [ ] **Access codes**: create a code (set duration + max redemptions) and confirm it appears active.
- [ ] **Announcements**: post one → confirm it appears as a **banner on the main site** for a signed-in user → hide it → banner disappears.
- [ ] **Settings → Maintenance mode**: turn ON → a **non-admin** user sees the maintenance notice → **turn it back OFF** (don't leave it on).
- [ ] **Feedback**: a report submitted from the main site (`/account#report`) appears here; mark it in-progress/resolved and confirm it sticks.
- [ ] **Unrecognised wording**: after the student run below, captured phrases appear; **Export CSV** downloads a file that opens cleanly.
- [ ] **Admin activity / audit**: your grant, code creation and announcement actions are logged.
- [ ] Every admin page: browser console shows **no red errors**.

## 2. Student happy path (Blockers)

Use a **real, fresh email** you control (not a synthetic account).

- [ ] **Sign up** → the confirmation email **actually arrives** (check spam) and the link works. *(Email delivery is the single most common pilot blocker — test it before the batch.)*
- [ ] **Sign in** works after confirmation.
- [ ] **Free trial**: without any code, the 2 free cases are playable end to end.
- [ ] **Redeem a code** at `/dashboard#access-code` (or on `/account`): success message, and the dashboard shows the active-until date.
- [ ] **Access unlocks**: a previously **locked** (paid) case is now playable after redemption.
- [ ] **Full case run**: complete one Practice case — dispensing → decision → patient conversation → results screen.
- [ ] **Result saves**: the passing/failing result appears in progress; a **Learn/tutorial** run does **not** count as an independent attempt.
- [ ] **Conversation sanity**: type a few natural counselling lines; the patient responds coherently and unrecognised wording gets captured (see admin step above).
- [ ] **Report a problem** from `/account#report` submits successfully.
- [ ] **Data export** (`/account`) downloads the account's data.

## 3. Access & entitlement edges

- [ ] **Revoke access** on a test account (admin) → that account can no longer open paid cases.
- [ ] A **used code** can't be redeemed twice (shows "already redeemed"); an **invalid** code shows a clear error, not a server error.
- [ ] The comp/trial date shown to the student matches what you granted.

## 4. Content & safety (Blockers for a clinical product)

- [ ] Cases/quizzes are labelled **draft / not certification** where students see scores; the test group is told **not to treat feedback as clinical certification**.
- [ ] The **supervising pharmacist/educator** has reviewed the cases the group will use and there's an agreed way to escalate disputed clinical feedback.
- [ ] "**Use fictional patient data only**" guidance is visible before students type free text.

## 5. Cross-browser / device

- [ ] Works in **Chrome** and one other browser (Edge/Firefox/Safari).
- [ ] **Laptop-first**: on a phone, the simulator shows the "use a laptop" guidance rather than breaking.
- [ ] Quick check: keyboard focus is visible and the pages are readable at laptop size (headings, contrast).

## 6. Operations & rollback

- [ ] You know **who monitors feedback** during the pilot and how fast you'll respond.
- [ ] You have the **maintenance-mode switch** ready as a soft "pause" if something goes wrong.
- [ ] Error monitoring/logs (Vercel) are somewhere you'll actually see them.
- [ ] The **invitation message** tells students: use a laptop, start with the tutorial, use fictional data, and report wording that was misunderstood.

---

## After it passes

Invite a **small** first wave (3–5), watch the *Unrecognised wording* page and feedback for a day or two, fix the top misses, then widen the group. Keep paid checkout closed until the separate paid-launch checklist (`launch-readiness.md`) is done.
