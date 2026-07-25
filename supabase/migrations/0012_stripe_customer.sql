-- Stripe subscription support.
--  1. Stores the Stripe customer id on the profile so subscription lifecycle
--     events (cancel / lapse) can be mapped back to the right user.
--  2. Extends the entitlement guard so a signed-in user cannot spoof their
--     stripe_customer_id either — only the service-role webhook may set it.
-- Idempotent: safe to run more than once. Requires 0011 to have run first.

alter table public.profiles
  add column if not exists stripe_customer_id text;

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
  return new;
end;
$$;

-- The BEFORE UPDATE trigger created in 0011 already points at this function;
-- recreating the function above is sufficient.
