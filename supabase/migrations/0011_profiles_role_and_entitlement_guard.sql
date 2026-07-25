-- Entitlement model for the paid launch.
--  1. Adds profiles.role ('student' default; set 'admin' by hand for developers).
--  2. Locks the privileged columns (has_paid, role, trial_cases_used) so a
--     signed-in user can never grant themselves paid access from the browser —
--     only server/service-role code (the payment webhook) may change them.
-- Idempotent: safe to run more than once.

alter table public.profiles
  add column if not exists role text not null default 'student';

-- A regular signed-in request carries auth.uid(); service-role / server contexts
-- do not. If a normal user tries to change any entitlement column, silently
-- revert it to its stored value. The payment webhook runs with the service-role
-- key (auth.uid() is null) and passes through.
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
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;

create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged_columns();
