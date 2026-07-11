-- Phase 4.7: Drug directory
-- All drug data is fictional/representative for dispensing practice only.

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
  supply_type       text        NOT NULL,   -- "NHS" | "Private"
  schedule          text,                   -- "S2" | "S3" | "S4" | "S8"
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

CREATE POLICY "Authenticated users can read drugs"
  ON drugs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can read drugs"
  ON drugs FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert drugs"
  ON drugs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated users can insert drugs"
  ON drugs FOR INSERT TO authenticated WITH CHECK (true);

-- Link cases to their correct drug variant
ALTER TABLE cases ADD COLUMN IF NOT EXISTS correct_drug_seed_id text;
CREATE INDEX IF NOT EXISTS idx_cases_correct_drug ON cases (correct_drug_seed_id);
