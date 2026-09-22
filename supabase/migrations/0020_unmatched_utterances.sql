-- Pilot corpus: student counselling wording the deterministic matcher did not
-- recognise. Used to grow the topic patterns from real phrasing. Written only by
-- the service-role client behind an authenticated, rate-limited endpoint; read
-- only by admins (through the service-role client on the admin subdomain).
--
-- Privacy: the captured text is the student's own counselling wording (fictional
-- patient data by instruction), not the student's personal data. user_id is kept
-- for volume/moderation but is nulled if the account is deleted, so the wording
-- corpus survives account deletion without retaining identity.
begin;

create table if not exists public.unmatched_utterances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  case_id text not null,
  stage text,
  turn_index integer,
  text text not null check (length(text) between 1 and 2000),
  patient_reply text,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.unmatched_utterances enable row level security;
revoke all on public.unmatched_utterances from anon, authenticated;
grant all on public.unmatched_utterances to service_role;

create index if not exists unmatched_utterances_case_idx
  on public.unmatched_utterances(case_id, created_at desc);
create index if not exists unmatched_utterances_unreviewed_idx
  on public.unmatched_utterances(reviewed, created_at desc);

commit;
