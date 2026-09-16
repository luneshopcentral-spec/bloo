-- Admin portal backing store.
--
-- Everything here is written only by the service-role admin client behind the
-- admin.* subdomain, which is itself gated on profiles.role = 'admin'. RLS is
-- enabled and locked to service_role for write; the few rows users must read
-- (active announcements, their own redemptions) get scoped read policies.
begin;

-- 1. Feedback can now sit in an "in_progress" state while an admin works it.
alter table public.feedback drop constraint if exists feedback_status_check;
alter table public.feedback
  add constraint feedback_status_check check (status in ('open', 'in_progress', 'resolved'));

-- 2. Time-limited comp access (trial codes / manual grants). The content gate
--    treats a future comp_access_until the same as has_paid; it expires on its
--    own with no webhook, so a lapsed trial silently closes access again.
alter table public.profiles add column if not exists comp_access_until timestamptz;

-- 3. Operational key/value settings (launch gate, trial limits, maintenance).
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.admin_settings enable row level security;
revoke all on public.admin_settings from anon, authenticated;
grant all on public.admin_settings to service_role;

-- 4. Site-wide announcements. Logged-in users read the active window only.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 160),
  body text not null check (length(body) between 1 and 2000),
  level text not null default 'info' check (level in ('info', 'success', 'warning', 'critical')),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to authenticated;
grant all on public.announcements to service_role;
drop policy if exists "announcements active read" on public.announcements;
create policy "announcements active read" on public.announcements for select to authenticated
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));
create index if not exists announcements_active_idx on public.announcements(active, starts_at desc);

-- 5. Trial access codes and their redemptions.
create table if not exists public.access_codes (
  code text primary key,
  description text,
  grants_days integer not null check (grants_days between 1 and 365),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemptions integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.access_codes enable row level security;
revoke all on public.access_codes from anon, authenticated;
grant all on public.access_codes to service_role;

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.access_codes(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_until timestamptz not null,
  redeemed_at timestamptz not null default now(),
  unique (code, user_id)
);
alter table public.access_code_redemptions enable row level security;
revoke all on public.access_code_redemptions from anon, authenticated;
grant select on public.access_code_redemptions to authenticated;
grant all on public.access_code_redemptions to service_role;
drop policy if exists "redemptions own read" on public.access_code_redemptions;
create policy "redemptions own read" on public.access_code_redemptions for select to authenticated
  using (auth.uid() = user_id);

-- Redeem atomically: validate the code, extend the caller's comp window, and
-- bump the redemption counter. security definer so an authenticated user can
-- redeem without any direct write grant on the tables above.
create or replace function public.redeem_access_code(input_code text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  row public.access_codes%rowtype;
  uid uuid := auth.uid();
  grant_until timestamptz;
  existing timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into row from public.access_codes where code = input_code for update;
  if not found then raise exception 'invalid code'; end if;
  if not row.active then raise exception 'code inactive'; end if;
  if row.expires_at is not null and row.expires_at < now() then raise exception 'code expired'; end if;
  if row.max_redemptions is not null and row.redemptions >= row.max_redemptions then
    raise exception 'code fully redeemed';
  end if;
  if exists (select 1 from public.access_code_redemptions where code = input_code and user_id = uid) then
    raise exception 'already redeemed';
  end if;

  grant_until := now() + make_interval(days => row.grants_days);
  insert into public.access_code_redemptions(code, user_id, granted_until)
    values (input_code, uid, grant_until);
  update public.access_codes set redemptions = redemptions + 1 where code = input_code;

  -- Extend, never shorten, an existing comp window.
  select comp_access_until into existing from public.profiles where id = uid;
  if existing is null or existing < grant_until then
    update public.profiles set comp_access_until = grant_until where id = uid;
  end if;
  return grant_until;
end; $$;
revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;

-- 6. Append-only audit log of every privileged admin action.
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant all on public.admin_audit_log to service_role;
create index if not exists admin_audit_log_created_idx on public.admin_audit_log(created_at desc);

commit;
