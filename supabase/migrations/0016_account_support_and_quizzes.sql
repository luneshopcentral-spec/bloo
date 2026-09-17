begin;
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('content','bug','privacy','other')), case_id text,
  message text not null check (length(message) between 10 and 4000),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant all on public.feedback to service_role;
create table if not exists public.quiz_attempts (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null, version text not null, mode text not null check (mode in ('practice','challenge')),
  answers jsonb not null, percentage integer not null check (percentage between 0 and 100),
  created_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
drop policy if exists "quiz attempts own read" on public.quiz_attempts;
create policy "quiz attempts own read" on public.quiz_attempts for select to authenticated using (auth.uid() = user_id);
create index if not exists quiz_attempts_user_created on public.quiz_attempts(user_id, created_at desc);

create table if not exists public.request_limits (key text primary key, count integer not null, expires_at timestamptz not null);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from anon, authenticated;
create or replace function public.consume_request_limit(request_key text, maximum integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  delete from public.request_limits where expires_at < now() - interval '1 day';
  insert into public.request_limits values(request_key, 1, now() + interval '1 hour')
  on conflict(key) do update set count = case when request_limits.expires_at < now() then 1 else request_limits.count + 1 end,
    expires_at = case when request_limits.expires_at < now() then now() + interval '1 hour' else request_limits.expires_at end
  returning count into used;
  return used <= maximum;
end; $$;
revoke all on function public.consume_request_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_request_limit(text, integer) to service_role;
commit;
