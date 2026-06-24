-- ============================================================
-- DispenseRx Practice — Initial Schema
-- Run this against a fresh Supabase project via the SQL editor
-- or the Supabase CLI: supabase db push
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
-- One row per auth user, auto-created by the trigger below.
create table if not exists public.profiles (
  id               uuid        primary key references auth.users (id) on delete cascade,
  email            text        not null,
  full_name        text        not null,
  university       text,
  year_of_study    int         check (year_of_study between 1 and 4),
  has_paid         boolean     not null default false,
  trial_cases_used int         not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read and update their own profile only.
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── cases ─────────────────────────────────────────────────────
create table if not exists public.cases (
  id             uuid        primary key default gen_random_uuid(),
  case_number    int         not null unique,
  title          text        not null,
  difficulty     text        not null check (difficulty in ('easy', 'medium', 'hard')),
  category       text        not null,
  case_data      jsonb       not null,
  is_free_trial  boolean     not null default false,
  created_at     timestamptz not null default now()
);

alter table public.cases enable row level security;

-- Every authenticated (and anonymous) user can read cases.
-- Free-trial gating will be enforced in application logic (Phase 7).
create policy "cases: public read"
  on public.cases for select
  using (true);

-- ── attempts ──────────────────────────────────────────────────
create table if not exists public.attempts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  case_id    uuid        not null references public.cases (id) on delete cascade,
  score      int         not null,
  max_score  int         not null,
  passed     boolean     not null,
  details    jsonb       not null,
  created_at timestamptz not null default now()
);

alter table public.attempts enable row level security;

create policy "attempts: own read"
  on public.attempts for select
  using (auth.uid() = user_id);

create policy "attempts: own insert"
  on public.attempts for insert
  with check (auth.uid() = user_id);

-- ── trigger: auto-create profile on sign-up ───────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, university, year_of_study)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'university',
    (new.raw_user_meta_data ->> 'year_of_study')::int
  );
  return new;
end;
$$;

-- Drop the trigger first so re-running the migration is idempotent.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
