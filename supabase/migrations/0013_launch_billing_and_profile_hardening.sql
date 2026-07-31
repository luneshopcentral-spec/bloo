-- Customer-launch hardening for subscription state, retry-safe webhook logging,
-- and inclusive study-stage profile data. Apply before enabling paid checkout.

begin;

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_plan text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_start timestamptz,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false,
  add column if not exists subscription_updated_at timestamptz,
  add column if not exists study_stage text;

create unique index if not exists profiles_stripe_customer_id_unique
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_unique
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  object_id text,
  status text not null check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1,
  error_message text,
  received_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;

-- No client policies are created: only the service-role webhook can read or
-- write the delivery log.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.has_paid := old.has_paid;
  new.role := old.role;
  new.trial_cases_used := old.trial_cases_used;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.subscription_plan := old.subscription_plan;
  new.subscription_status := old.subscription_status;
  new.subscription_current_period_start := old.subscription_current_period_start;
  new.subscription_current_period_end := old.subscription_current_period_end;
  new.subscription_cancel_at_period_end := old.subscription_cancel_at_period_end;
  new.subscription_updated_at := old.subscription_updated_at;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  numeric_year integer;
begin
  if (new.raw_user_meta_data ->> 'study_stage') in ('year_1', 'year_2', 'year_3', 'year_4') then
    numeric_year := right(new.raw_user_meta_data ->> 'study_stage', 1)::integer;
  else
    numeric_year := null;
  end if;

  insert into public.profiles (
    id, email, full_name, university, year_of_study, study_stage
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'university', ''),
    numeric_year,
    nullif(new.raw_user_meta_data ->> 'study_stage', '')
  );
  return new;
end;
$$;

commit;
