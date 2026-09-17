-- Atomic access changes and accurate, paginated admin reporting.
begin;
alter table public.access_codes add column if not exists grants_minutes integer check (grants_minutes between 15 and 525600);
alter table public.access_codes add column if not exists assigned_email text;

-- The old authenticated RPC could not update the protected entitlement column.
-- Only the authenticated application server may call this replacement, after
-- user verification and rate limiting. No client can choose a recipient UUID.
drop function if exists public.redeem_access_code(text);
create or replace function public.redeem_access_code_for_user(input_code text, recipient_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  c public.access_codes%rowtype;
  p public.profiles%rowtype;
  until_at timestamptz;
  recipient_email text;
begin
  select * into p from public.profiles where id = recipient_id for update;
  if not found then raise exception 'profile missing'; end if;
  select email into recipient_email from auth.users where id = recipient_id;
  select * into c from public.access_codes where code = upper(trim(input_code)) for update;
  if not found then raise exception 'invalid code'; end if;
  if not c.active then raise exception 'code inactive'; end if;
  if c.expires_at is not null and c.expires_at <= now() then raise exception 'code expired'; end if;
  if c.assigned_email is not null and lower(c.assigned_email) <> lower(coalesce(recipient_email,'')) then raise exception 'invalid code'; end if;
  if exists(select 1 from public.access_code_redemptions where code = c.code and user_id = recipient_id) then raise exception 'already redeemed'; end if;
  if c.max_redemptions is not null and c.redemptions >= c.max_redemptions then raise exception 'code fully redeemed'; end if;
  until_at := greatest(coalesce(p.comp_access_until,now()), now() + make_interval(mins => coalesce(c.grants_minutes,c.grants_days*1440)));
  update public.profiles set comp_access_until = until_at where id = recipient_id;
  insert into public.access_code_redemptions(code,user_id,granted_until) values(c.code,recipient_id,until_at);
  update public.access_codes set redemptions=redemptions+1 where code=c.code;
  return until_at;
end; $$;
revoke all on function public.redeem_access_code_for_user(text,uuid) from public,anon,authenticated;
grant execute on function public.redeem_access_code_for_user(text,uuid) to service_role;

create or replace function public.admin_manage_access(actor_id uuid, operation jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  actor public.profiles%rowtype;
  target public.profiles%rowtype;
  action text := operation->>'action';
  target_id uuid;
  code_value text;
  duration integer;
  until_at timestamptz;
  result jsonb := '{"ok":true}'::jsonb;
  audit_type text;
  audit_target text;
begin
  -- Serialize role changes, so a concurrently demoted operator cannot act on a
  -- stale role check. Access grants additionally lock the recipient profile.
  perform pg_advisory_xact_lock(hashtext('admin-access-management'));
  select * into actor from public.profiles where id=actor_id;
  if not found or actor.role <> 'admin' then raise exception 'not authorised'; end if;
  if action in ('create','set_active') then
    code_value := upper(trim(operation->>'code'));
    if code_value is null or code_value !~ '^[A-Z0-9][A-Z0-9-]{2,31}$' then raise exception 'invalid code'; end if;
    audit_type := 'access_code'; audit_target := code_value;
    if action='create' then
      duration := (operation->>'grantsMinutes')::integer;
      if duration is null or duration not between 15 and 525600 then raise exception 'invalid duration'; end if;
      if (operation->>'expiresAt')::timestamptz <= now() then raise exception 'invalid expiry'; end if;
      insert into public.access_codes(code,description,grants_days,grants_minutes,max_redemptions,expires_at,assigned_email,created_by)
      values(code_value,nullif(operation->>'description',''),greatest(1,ceil(duration/1440.0)::integer),duration,
        (operation->>'maxRedemptions')::integer,(operation->>'expiresAt')::timestamptz,lower(nullif(operation->>'assignedEmail','')),actor_id);
    else
      update public.access_codes set active=(operation->>'active')::boolean where code=code_value;
      if not found then raise exception 'target not found'; end if;
    end if;
  elsif action in ('set_role','grant_comp','revoke_comp','reset_progress') then
    target_id := (operation->>'userId')::uuid;
    select * into target from public.profiles where id=target_id for update;
    if not found then raise exception 'target not found'; end if;
    audit_type := 'profile'; audit_target := target_id::text;
    if action='set_role' then
      if operation->>'role' not in ('admin','student') or operation->>'role' is null then raise exception 'invalid role'; end if;
      if actor_id=target_id and operation->>'role' <> 'admin' then raise exception 'cannot demote self'; end if;
      update public.profiles set role=operation->>'role' where id=target_id;
    elsif action='grant_comp' then
      duration := (operation->>'minutes')::integer;
      if duration is null or duration not between 15 and 525600 then raise exception 'invalid duration'; end if;
      until_at := greatest(coalesce(target.comp_access_until,now()),now()+make_interval(mins=>duration));
      update public.profiles set comp_access_until=until_at where id=target_id;
      result := result || jsonb_build_object('until',until_at);
    elsif action='revoke_comp' then
      update public.profiles set comp_access_until=null where id=target_id;
    else
      delete from public.attempts where user_id=target_id;
      delete from public.quiz_attempts where user_id=target_id;
      delete from public.practice_sessions where user_id=target_id;
      update public.profiles set trial_cases_used=0 where id=target_id;
    end if;
  else raise exception 'invalid action'; end if;
  insert into public.admin_audit_log(actor_id,actor_email,action,target_type,target_id,detail)
    values(actor.id,actor.email, audit_type||'.'||action,audit_type,audit_target,operation||result);
  return result;
end; $$;
revoke all on function public.admin_manage_access(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_manage_access(uuid,jsonb) to service_role;

create or replace function public.admin_list_users(search_term text default '', page_offset integer default 0, page_size integer default 50, access_filter text default 'all')
returns jsonb language sql stable security definer set search_path = public as $$
  with filtered as (
    select p.* from public.profiles p
    where (coalesce(search_term,'')='' or strpos(lower(p.email),lower(search_term))>0 or strpos(lower(p.full_name),lower(search_term))>0)
      and (access_filter='all' or (access_filter='admin' and p.role='admin')
        or (access_filter='paid' and p.has_paid)
        or (access_filter='trial' and p.comp_access_until>now())
        or (access_filter='free' and not p.has_paid and p.role<>'admin' and coalesce(p.comp_access_until,now())<=now()))
  ), page as (
    select * from filtered order by created_at desc,id limit least(greatest(page_size,1),100) offset greatest(page_offset,0)
  ), rows as (
    select p.id,p.email,p.full_name,p.university,p.role,p.has_paid,p.subscription_plan,p.subscription_status,p.comp_access_until,p.created_at,
      a.total as attempts,a.passed,a.last_practice,q.total as quiz_attempts,q.last_quiz
    from page p
    cross join lateral (select count(*) as total,count(*) filter(where passed) as passed,max(created_at) as last_practice from public.attempts where user_id=p.id and server_verified and not assisted and counts_toward_progress) a
    cross join lateral (select count(*) as total,max(created_at) as last_quiz from public.quiz_attempts where user_id=p.id) q
  )
  select jsonb_build_object('total',(select count(*) from filtered),'rows',coalesce((select jsonb_agg(rows order by created_at desc,id) from rows),'[]'::jsonb));
$$;
revoke all on function public.admin_list_users(text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.admin_list_users(text,integer,integer,text) to service_role;
commit;
