# DispenseRx Practice

A web app that lets Australian pharmacy university students practise Fred Dispense-style dispensing workflows from home.

> **Independent study tool — not affiliated with Fred IT Group Pty Ltd.**

---

## Setup

### Prerequisites

- Node.js 18.18+ (use [nvm](https://github.com/nvm-sh/nvm) or install from [nodejs.org](https://nodejs.org))
- A [Supabase](https://supabase.com) account (free tier is fine)

---

### 1. Clone and install

```bash
git clone <your-repo-url>
cd dispense-rx-practice
npm install
```

---

### 2. Create a Supabase project

1. Go to [app.supabase.com](https://app.supabase.com) and create a new project.
2. Wait for the project to finish provisioning (~1 minute).

---

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the values from your Supabase project:

- **`NEXT_PUBLIC_SUPABASE_URL`** → Settings → API → Project URL
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** → Settings → API → anon public key

---

### 4. Run the database migration

Open your Supabase project → **SQL Editor** → **New query**.

Run every file in `supabase/migrations/` in numeric order and click **Run** after each file.
For an existing project already on migration 0007, run only
`supabase/migrations/0008_complex_cases.sql` for the six new patients,
prescribers, medicine products and patient histories.

This creates:
- `profiles` table (auto-populated on sign-up via trigger)
- `cases` table
- `attempts` table
- Row Level Security policies on all tables
- A trigger that creates a profile row whenever a new user signs up

The migrations are idempotent — safe to run multiple times.

#### Alternative: Supabase CLI

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and the project linked:

```bash
supabase db push
```

---

### 5. Configure Supabase Auth redirect URL

In Supabase → **Authentication → URL Configuration**, add the following to **Redirect URLs**:

```
http://localhost:3000/auth/callback
```

When you deploy, also add your production URL (e.g. `https://yourdomain.com/auth/callback`).

---

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the landing page.

---

## Project structure

```
src/
  app/
    (marketing)/        # Landing page, pricing, about
    (auth)/             # Sign-in, sign-up, forgot-password
    (app)/              # Protected app routes (dashboard, practice)
    auth/callback/      # Supabase auth callback handler
  components/
    ui/                 # shadcn/ui primitives
    marketing/          # Landing page sections
    app/                # App shell (nav bar)
  lib/
    supabase/           # Browser + server Supabase clients
    types/              # TypeScript types (database schema)
    utils.ts            # cn() helper
middleware.ts           # Session refresh + route protection
supabase/migrations/    # SQL migration files
```

---

## Acceptance checklist

- [ ] `npm run dev` shows the landing page at http://localhost:3000
- [ ] Sign up with email/password → lands on `/dashboard`
- [ ] A row appears in `profiles` automatically on sign-up
- [ ] Sign out → sign back in → dashboard visible
- [ ] Visiting `/dashboard` while logged out redirects to `/sign-in`
- [ ] SQL migration runs cleanly on a fresh Supabase project

---

## Phase roadmap

| Phase | Description |
|-------|-------------|
| **1** | **Foundation, Auth & Landing Page** ← you are here |
| 2 | Fred Dispense simulator UI |
| 3 | First 10 practice cases |
| 4 | Scoring engine |
| 5 | Progress tracking & analytics |
| 6 | Case library expansion (50+ cases) |
| 7 | Stripe paywall integration |
| 8 | Polish, SEO & launch |

---

## Disclaimer

DispenseRx Practice is an independent study tool created to help pharmacy students practise dispensing skills. It is **not affiliated with, endorsed by, or connected to Fred IT Group Pty Ltd**. "Fred Dispense" is a trademark of Fred IT Group Pty Ltd.
