begin;
create or replace function public.launch_schema_ready()
returns boolean language sql security definer set search_path = public as $$
  select not has_column_privilege('authenticated','public.profiles','has_paid','UPDATE')
    and not has_column_privilege('authenticated','public.profiles','role','UPDATE')
    and not has_table_privilege('authenticated','public.attempts','INSERT')
    and not has_table_privilege('anon','public.patients','SELECT')
    and not has_table_privilege('authenticated','public.drugs','INSERT')
    and to_regclass('public.practice_sessions') is not null
    and to_regclass('public.quiz_attempts') is not null
    and to_regclass('public.feedback') is not null;
$$;
revoke all on function public.launch_schema_ready() from public, anon, authenticated;
grant execute on function public.launch_schema_ready() to service_role;
commit;
