-- Phase 4.6: Patient database
-- All patient data is fake practice fixtures — no real PII is stored here.

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id text UNIQUE,                     -- stable identifier for idempotent seeding
  surname text NOT NULL,
  firstname text NOT NULL,
  title text,                              -- MR, MRS, MS, MISS, DR, MASTER
  sex text,                                -- M, F
  date_of_birth date,
  address text,
  suburb text,
  postcode text,
  phone text,
  medicare_card text,                      -- formatted "XXXX-XXXXX-X"
  medicare_valid_to text,                  -- "MM/YYYY"
  concession_type text,                    -- C (concession), S (safety net), P (pension)
  concession_number text,
  concession_valid_to text,
  allergies text[] DEFAULT '{}',
  patient_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_surname ON patients (lower(surname));
CREATE INDEX IF NOT EXISTS idx_patients_seed_id ON patients (seed_id);

CREATE TABLE IF NOT EXISTS patient_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  script_date text NOT NULL,               -- "DD/MM/YY" or "DD/MM/YYYY"
  drug text NOT NULL,
  qty text,
  repeats int DEFAULT 0,
  rx_number text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_scripts_patient ON patient_scripts (patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_scripts_unique
  ON patient_scripts (patient_id, script_date, drug);

-- RLS: practice data readable/writable by any authenticated user
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read patients"
  ON patients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read patient scripts"
  ON patient_scripts FOR SELECT TO authenticated USING (true);
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
