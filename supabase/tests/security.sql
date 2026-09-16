\set ON_ERROR_STOP on
insert into auth.users(id, email) values ('10000000-0000-4000-8000-000000000001','one@example.invalid'), ('10000000-0000-4000-8000-000000000002','two@example.invalid');
begin;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Profile isolation failed'; end if;
  update public.profiles set full_name = 'Student One' where id = auth.uid();
  begin update public.profiles set has_paid = true where id = auth.uid(); raise exception 'Paid escalation allowed'; exception when insufficient_privilege then null; end;
  begin update public.profiles set role = 'admin' where id = auth.uid(); raise exception 'Role escalation allowed'; exception when insufficient_privilege then null; end;
  begin update public.profiles set trial_cases_used = 999 where id = auth.uid(); raise exception 'Trial escalation allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.attempts(user_id,case_id,score,max_score,passed,details) values(auth.uid(),'case-13',999,1,true,'{}'); raise exception 'Forged score accepted'; exception when insufficient_privilege then null; end;
  begin insert into public.drugs(generic_name) values('FORGED'); raise exception 'Directory poisoning allowed'; exception when insufficient_privilege then null; end;
  begin perform public.acquire_operation_lock('billing',gen_random_uuid()); raise exception 'Client billing lock allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.practice_sessions; raise exception 'Client session access allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
begin;
set local role anon;
do $$ begin
  begin perform * from public.patients; raise exception 'Anonymous patient access allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.drugs; raise exception 'Anonymous drug access allowed'; exception when insufficient_privilege then null; end;
  begin perform * from public.patient_scripts; raise exception 'Anonymous history access allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
begin;
set local role service_role;
set local request.jwt.claim.role = 'service_role';
update public.profiles set has_paid = true where id = '10000000-0000-4000-8000-000000000001';
do $$ begin
  if not (select has_paid from public.profiles where id = '10000000-0000-4000-8000-000000000001') then raise exception 'Service billing write failed'; end if;
  if not public.acquire_operation_lock('test', '20000000-0000-4000-8000-000000000001') then raise exception 'First lock failed'; end if;
  if public.acquire_operation_lock('test', '20000000-0000-4000-8000-000000000002') then raise exception 'Concurrent lock admitted'; end if;
  perform public.release_operation_lock('test', '20000000-0000-4000-8000-000000000002');
  if public.acquire_operation_lock('test', gen_random_uuid()) then raise exception 'Wrong owner released lock'; end if;
  perform public.release_operation_lock('test', '20000000-0000-4000-8000-000000000001');
  if not public.consume_request_limit('test-limit', 1) then raise exception 'First request denied'; end if;
  if public.consume_request_limit('test-limit', 1) then raise exception 'Rate limit failed'; end if;
end $$;
rollback;
select 'Security boundary tests passed' as result;
