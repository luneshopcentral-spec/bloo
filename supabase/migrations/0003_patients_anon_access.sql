-- Phase 4.6.1: Add anon-role access so the seed script works without
-- a service-role key. All patient data in this project is fictional
-- practice fixtures — no real PII. The app still requires Supabase
-- Auth (middleware) to load the practice page.

-- Allow anon role to read patients (needed for SELECT count/search in seed)
CREATE POLICY "Anon can read patients"
  ON patients FOR SELECT TO anon USING (true);

-- Allow anon role to insert patients (needed for seed upsert)
CREATE POLICY "Anon can insert patients"
  ON patients FOR INSERT TO anon WITH CHECK (true);

-- Allow anon role to read patient scripts (seed verifies inserts)
CREATE POLICY "Anon can read patient scripts"
  ON patient_scripts FOR SELECT TO anon USING (true);

-- Allow anon role to insert patient scripts
CREATE POLICY "Anon can insert patient scripts"
  ON patient_scripts FOR INSERT TO anon WITH CHECK (true);

-- Also add missing authenticated INSERT policy for patient_scripts
-- (PatientDetailsModal needs this to add scripts in-app)
CREATE POLICY "Authenticated users can insert patient scripts"
  ON patient_scripts FOR INSERT TO authenticated WITH CHECK (true);

-- Change date_of_birth to text so students can type DD/MM/YYYY from
-- a prescription without needing a format conversion step.
ALTER TABLE patients ALTER COLUMN date_of_birth TYPE text;
