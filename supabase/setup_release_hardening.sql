-- DispenseRx Practice release-hardening update
-- HOW TO RUN: open this file, copy all SQL below, paste it into a new
-- Supabase SQL Editor query, then click Run. Do not type the filename into
-- the SQL editor.

BEGIN;

-- Correct the historical training seed. Temazepam is Schedule 4 and is
-- monitored in SafeScript in Victoria.
UPDATE public.drugs
SET schedule = 'S4'
WHERE UPPER(generic_name) = 'TEMAZEPAM'
  AND schedule IS DISTINCT FROM 'S4';

-- Static simulator cases use stable text identifiers (case-1, case-2, ...).
ALTER TABLE public.attempts
  DROP CONSTRAINT IF EXISTS attempts_case_id_fkey;

ALTER TABLE public.attempts
  ALTER COLUMN case_id TYPE text USING case_id::text;

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS case_version text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'practice',
  ADD COLUMN IF NOT EXISTS assisted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS counts_toward_progress boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS critical_failures text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS competencies jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attempts_mode_check'
  ) THEN
    ALTER TABLE public.attempts
      ADD CONSTRAINT attempts_mode_check CHECK (mode IN ('learn', 'practice', 'exam'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS attempts_user_created_idx
  ON public.attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS attempts_user_progress_idx
  ON public.attempts (user_id, counts_toward_progress, created_at DESC);

COMMIT;
