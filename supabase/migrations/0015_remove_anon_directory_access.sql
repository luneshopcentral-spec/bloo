-- Production hardening: simulator directories are available only after
-- Supabase authentication. Seeding must use SUPABASE_SERVICE_ROLE_KEY.

DROP POLICY IF EXISTS "Anon can read patients" ON public.patients;
DROP POLICY IF EXISTS "Anon can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Anon can read patient scripts" ON public.patient_scripts;
DROP POLICY IF EXISTS "Anon can insert patient scripts" ON public.patient_scripts;
DROP POLICY IF EXISTS "Anon can read drugs" ON public.drugs;
DROP POLICY IF EXISTS "Anon can insert drugs" ON public.drugs;

-- Students may read the shared fictional directories, but they must not mutate
-- them. "Add new" workflow entries are kept in the current simulator attempt.
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can insert patient scripts" ON public.patient_scripts;
DROP POLICY IF EXISTS "Authenticated users can insert drugs" ON public.drugs;
DROP POLICY IF EXISTS "Authenticated users can insert prescribers" ON public.prescribers;
