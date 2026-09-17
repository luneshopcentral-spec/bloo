begin;

revoke all on public.patients, public.patient_scripts, public.drugs, public.prescribers from anon;
revoke insert, update, delete, truncate, references, trigger on public.patients, public.patient_scripts, public.drugs, public.prescribers from authenticated;
grant select on public.patients, public.patient_scripts, public.drugs, public.prescribers to authenticated;
revoke insert, update, delete on public.attempts from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, university, year_of_study, study_stage) on public.profiles to authenticated;

-- Also protect columns if a broad table grant is accidentally restored.
create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or current_setting('role', true) = 'postgres' then return new; end if;
  if (to_jsonb(new) - array['full_name','university','year_of_study','study_stage'])
     is distinct from (to_jsonb(old) - array['full_name','university','year_of_study','study_stage']) then
    raise exception 'Only personal profile fields may be edited';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_privileged_columns on public.profiles;
drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger protect_profile_privileged_columns before update on public.profiles
for each row execute function public.protect_profile_privileged_columns();

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null, case_version text not null,
  seed bigint not null check (seed >= 0),
  mode text not null check (mode in ('learn', 'practice', 'exam')),
  assisted boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.practice_sessions enable row level security;
revoke all on public.practice_sessions from anon, authenticated;
grant all on public.practice_sessions to service_role;
create index if not exists practice_sessions_user_created on public.practice_sessions(user_id, created_at desc);

create table if not exists public.operation_locks (
  key text primary key, owner uuid not null, expires_at timestamptz not null
);
alter table public.operation_locks enable row level security;
revoke all on public.operation_locks from anon, authenticated;
create or replace function public.acquire_operation_lock(lock_key text, lock_owner uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare acquired text;
begin
  insert into public.operation_locks(key, owner, expires_at) values(lock_key, lock_owner, now() + interval '5 minutes')
  on conflict(key) do update set owner = excluded.owner, expires_at = excluded.expires_at
  where operation_locks.expires_at < now() returning key into acquired;
  return acquired is not null;
end; $$;
create or replace function public.release_operation_lock(lock_key text, lock_owner uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.operation_locks where key = lock_key and owner = lock_owner;
$$;
revoke all on function public.acquire_operation_lock(text, uuid), public.release_operation_lock(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_operation_lock(text, uuid), public.release_operation_lock(text, uuid) to service_role;

-- Historical client scores are retained but not represented as verified.
alter table public.attempts add column if not exists server_verified boolean not null default false;
commit;
