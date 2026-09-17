-- Run after migrations in the isolated launch_audit database.
\set ON_ERROR_STOP on
begin;
set local role postgres;
insert into auth.users(id,email) values
 ('30000000-0000-4000-8000-000000000001','admin@example.invalid'),
 ('30000000-0000-4000-8000-000000000002','learner@example.invalid'),
 ('30000000-0000-4000-8000-000000000003','second@example.invalid');
update public.profiles set role='admin' where id='30000000-0000-4000-8000-000000000001';
set local role service_role;
set local request.jwt.claim.role='service_role';
do $$
declare
 operator_id uuid := '30000000-0000-4000-8000-000000000001';
 learner uuid := '30000000-0000-4000-8000-000000000002';
 second_user uuid := '30000000-0000-4000-8000-000000000003';
 until_at timestamptz;
 before_count integer;
 report jsonb;
begin
 perform public.admin_manage_access(operator_id,'{"action":"create","code":"TWO-HOURS","grantsMinutes":120,"maxRedemptions":1}'::jsonb);
 until_at := public.redeem_access_code_for_user('  two-hours ',learner);
 if until_at <> now()+interval '2 hours' then raise exception 'Wrong hour-based expiry'; end if;
 if (select comp_access_until from public.profiles where id=learner) <> until_at then raise exception 'Protected entitlement grant did not persist'; end if;
 if (select redemptions from public.access_codes where code='TWO-HOURS') <> 1 then raise exception 'Redemption counter mismatch'; end if;
 begin perform public.redeem_access_code_for_user('TWO-HOURS',learner); raise exception 'duplicate accepted'; exception when others then if sqlerrm<>'already redeemed' then raise; end if; end;
 begin perform public.redeem_access_code_for_user('TWO-HOURS',second_user); raise exception 'capacity exceeded'; exception when others then if sqlerrm<>'code fully redeemed' then raise; end if; end;
 perform public.admin_manage_access(operator_id,jsonb_build_object('action','grant_comp','userId',learner,'minutes',14400));
 perform public.admin_manage_access(operator_id,jsonb_build_object('action','grant_comp','userId',learner,'minutes',60));
 if (select comp_access_until from public.profiles where id=learner)<>now()+interval '10 days' then raise exception 'Short manual grant shortened access'; end if;
 perform public.admin_manage_access(operator_id,'{"action":"create","code":"LONGER-EXISTING","grantsMinutes":60}'::jsonb);
 until_at:=public.redeem_access_code_for_user('LONGER-EXISTING',learner);
 if until_at<>now()+interval '10 days' then raise exception 'Redemption returned wrong effective expiry'; end if;
 perform public.admin_manage_access(operator_id,'{"action":"create","code":"EMAIL-ONLY","grantsMinutes":1440,"assignedEmail":"learner@example.invalid"}'::jsonb);
 begin perform public.redeem_access_code_for_user('EMAIL-ONLY',second_user); raise exception 'Email restriction bypassed'; exception when others then if sqlerrm<>'invalid code' then raise; end if; end;
 perform public.admin_manage_access(operator_id,'{"action":"set_active","code":"EMAIL-ONLY","active":false}'::jsonb);
 begin perform public.redeem_access_code_for_user('EMAIL-ONLY',learner); raise exception 'Inactive code accepted'; exception when others then if sqlerrm<>'code inactive' then raise; end if; end;
 update public.access_codes set active=true,expires_at=now() where code='EMAIL-ONLY';
 begin perform public.redeem_access_code_for_user('EMAIL-ONLY',learner); raise exception 'Expiry boundary accepted'; exception when others then if sqlerrm<>'code expired' then raise; end if; end;
 select count(*) into before_count from public.admin_audit_log;
 begin perform public.admin_manage_access(operator_id,jsonb_build_object('action','set_role','userId',operator_id,'role','student')); raise exception 'Self-demotion accepted'; exception when others then if sqlerrm<>'cannot demote self' then raise; end if; end;
 if (select count(*) from public.admin_audit_log)<>before_count then raise exception 'Failed action emitted successful audit'; end if;
 begin perform public.admin_manage_access(learner,jsonb_build_object('action','grant_comp','userId',learner,'minutes',1440)); raise exception 'Student acted as admin'; exception when others then if sqlerrm<>'not authorised' then raise; end if; end;
 perform public.admin_manage_access(operator_id,jsonb_build_object('action','revoke_comp','userId',learner));
 if (select comp_access_until from public.profiles where id=learner) is not null then raise exception 'Revoke failed'; end if;
 if not exists(select 1 from public.admin_audit_log where actor_id=operator_id and action='profile.revoke_comp' and target_id=learner::text) then raise exception 'Access audit missing'; end if;
 report:=public.admin_list_users('example.invalid',0,1,'all');
 if jsonb_array_length(report->'rows')<>1 or (report->>'total')::integer<3 then raise exception 'Pagination incorrect'; end if;
 report:=public.admin_list_users('%),role.eq.admin',0,50,'all');
 if (report->>'total')::integer<>0 then raise exception 'Search was interpreted as a query'; end if;
end $$;

-- A failed audit insert must roll back the access change as well.
set local role postgres;
alter table public.admin_audit_log add constraint reject_test_audit check (target_id <> 'AUDIT-ROLLBACK');
set local role service_role;
do $$ begin
 begin
  perform public.admin_manage_access('30000000-0000-4000-8000-000000000001','{"action":"create","code":"AUDIT-ROLLBACK","grantsMinutes":60}');
  raise exception 'Audit failure did not fail the operation';
 exception when check_violation then null; end;
 if exists(select 1 from public.access_codes where code='AUDIT-ROLLBACK') then raise exception 'Unaudited access change persisted'; end if;
end $$;

set local role authenticated;
set local request.jwt.claim.role='authenticated';
set local request.jwt.claim.sub='30000000-0000-4000-8000-000000000002';
do $$ begin
 begin update public.profiles set comp_access_until=now()+interval '1 year' where id=auth.uid(); raise exception 'Self-grant allowed'; exception when insufficient_privilege then null; end;
 begin perform public.redeem_access_code_for_user('TWO-HOURS',auth.uid()); raise exception 'Direct redemption RPC allowed'; exception when insufficient_privilege then null; end;
 begin perform public.admin_manage_access(auth.uid(),'{}'); raise exception 'Direct admin RPC allowed'; exception when insufficient_privilege then null; end;
 begin perform public.admin_list_users(); raise exception 'User enumeration allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.admin_audit_log; raise exception 'Audit leaked'; exception when insufficient_privilege then null; end;
 begin perform * from public.access_codes; raise exception 'Codes leaked'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.access_code_redemptions where user_id<>auth.uid()) then raise exception 'Another user redemption leaked'; end if;
end $$;
rollback;
select 'Admin access workflow tests passed' as result;
