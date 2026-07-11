-- Phase 4.7: Drug directory setup
-- Paste this entire file into the Supabase SQL Editor and run it.
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS drugs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id           text        UNIQUE NOT NULL,
  generic_name      text        NOT NULL,
  brand_name        text,
  full_display_name text        NOT NULL,
  form              text        NOT NULL,
  strength          text        NOT NULL,
  pack_size         text        NOT NULL,
  qty_default       int         NOT NULL,
  repeats_default   int         DEFAULT 0,
  supply_type       text        NOT NULL,
  schedule          text,
  pbs_code          text,
  ws_cost           numeric,
  retail_price      numeric,
  manufacturer_code text,
  manufacturer_full text,
  is_generic        boolean     DEFAULT false,
  cmi_available     boolean     DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drugs_generic  ON drugs (lower(generic_name));
CREATE INDEX IF NOT EXISTS idx_drugs_display  ON drugs (lower(full_display_name));

ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'drugs' AND policyname = 'Authenticated users can read drugs'
  ) THEN
    CREATE POLICY "Authenticated users can read drugs"
      ON drugs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'drugs' AND policyname = 'Anon can read drugs'
  ) THEN
    CREATE POLICY "Anon can read drugs"
      ON drugs FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'drugs' AND policyname = 'Anon can insert drugs'
  ) THEN
    CREATE POLICY "Anon can insert drugs"
      ON drugs FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'drugs' AND policyname = 'Authenticated users can insert drugs'
  ) THEN
    CREATE POLICY "Authenticated users can insert drugs"
      ON drugs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS correct_drug_seed_id text;
