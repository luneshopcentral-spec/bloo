-- Launch upgrade for an existing database with migrations 0001-0005.
-- Back up first. Paste the entire file into Supabase SQL Editor.
-- This bundle does not modify the Supabase CLI migration ledger.
BEGIN;

-- 0006_correct_temazepam_schedule.sql
-- Correct the historical training seed. Temazepam is Schedule 4 and is
-- monitored in SafeScript in Victoria; SafeScript monitoring does not make it
-- a Schedule 8 medicine.
UPDATE public.drugs
SET schedule = 'S4'
WHERE UPPER(generic_name) = 'TEMAZEPAM'
  AND schedule IS DISTINCT FROM 'S4';


-- 0007_attempt_progress.sql
-- Static simulator cases use stable text identifiers (case-1, case-2, ...),
-- so attempts must not depend on an unseeded UUID cases row.
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


-- 0008_complex_cases.sql
-- Complex cases 7–12. Safe to run repeatedly in the Supabase SQL Editor.
-- All names, identifiers and contact details are fictional training data.

INSERT INTO prescribers
  (seed_id, title, surname, firstname, prescriber_number, practice_name, address, suburb, state, postcode, phone)
VALUES
  ('prescriber-singh-amrita', 'DR', 'SINGH', 'AMRITA', '6147283', 'Yarra Pain and Palliative Clinic', '80 SWAN STREET', 'RICHMOND', 'VIC', '3121', '(03) 9000 1107'),
  ('prescriber-rao-nisha', 'DR', 'RAO', 'NISHA', '7812456', 'North Metro Child Psychiatry', '40 SYDNEY ROAD', 'BRUNSWICK', 'VIC', '3056', '(03) 9000 1108'),
  ('prescriber-murphy-ellen', 'DR', 'MURPHY', 'ELLEN', '3481752', 'Eastern Specialist Centre', '12 WHITEHORSE ROAD', 'BOX HILL', 'VIC', '3128', '(03) 9000 1109'),
  ('prescriber-lee-jonathan', 'DR', 'LEE', 'JONATHAN', '5294061', 'Camberwell Cardiology', '88 BURKE ROAD', 'CAMBERWELL', 'VIC', '3124', '(03) 9000 1110')
ON CONFLICT (prescriber_number) DO UPDATE SET
  seed_id = EXCLUDED.seed_id,
  title = EXCLUDED.title,
  surname = EXCLUDED.surname,
  firstname = EXCLUDED.firstname,
  practice_name = EXCLUDED.practice_name,
  address = EXCLUDED.address,
  suburb = EXCLUDED.suburb,
  state = EXCLUDED.state,
  postcode = EXCLUDED.postcode,
  phone = EXCLUDED.phone;

INSERT INTO patients
  (seed_id, surname, firstname, title, sex, date_of_birth, address, suburb, postcode, phone,
   medicare_card, medicare_valid_to, concession_type, concession_number, allergies, patient_notes)
VALUES
  ('patient-peter-morales-richmond', 'MORALES', 'PETER', 'MR', 'M', '1963-08-19', '18 BRIDGE ROAD', 'RICHMOND', '3121', '(03) 9000 2207', '4928-30177-4', '08/2028', NULL, NULL, '{}', 'Metastatic prostate cancer. Stable oxycodone modified-release therapy for six months; breakthrough analgesia documented.'),
  ('patient-helen-brooks-kew', 'BROOKS', 'HELEN', 'MRS', 'F', '1945-02-04', '6 WALPOLE STREET', 'KEW', '3101', '(03) 9000 2208', '5832-11904-2', '02/2028', 'P', 'P 901 233 008K', '{}', 'Osteoarthritis. Opioid-naive; uses paracetamol only. Lives alone.'),
  ('patient-noah-williams-brunswick', 'WILLIAMS', 'NOAH', 'MR', 'M', '2009-11-11', '91 SYDNEY ROAD', 'BRUNSWICK', '3056', '(03) 9000 2209', '6741-55029-1', '11/2028', NULL, NULL, '{}', 'ADHD. Dexamfetamine continuation treatment; parent usually collects.'),
  ('patient-grace-lim-box-hill', 'LIM', 'GRACE', 'MS', 'F', '1967-09-09', '27 STATION STREET', 'BOX HILL', '3128', '(03) 9000 2210', '7250-44810-8', '09/2029', NULL, NULL, '{}', 'Rheumatoid arthritis. Established weekly methotrexate and folic-acid plan; routine FBC, LFT and renal monitoring.'),
  ('patient-rahul-mehta-footscray', 'MEHTA', 'RAHUL', 'MR', 'M', '1982-01-29', '14 PAISLEY STREET', 'FOOTSCRAY', '3011', '(03) 9000 2211', '8164-33071-5', '01/2029', NULL, NULL, '{}', 'Bipolar disorder. Lithium maintenance. Current vomiting and diarrhoea with reduced oral intake; self-started ibuprofen.'),
  ('patient-evelyn-scott-camberwell', 'SCOTT', 'EVELYN', 'MRS', 'F', '1942-12-02', '55 BURKE ROAD', 'CAMBERWELL', '3124', '(03) 9000 2212', '9073-22581-9', '12/2028', 'P', 'P 881 240 002S', '{}', 'Non-valvular atrial fibrillation. Weight 54 kg, serum creatinine 168 micromol/L, eGFR 22. Uses naproxen most days.')
ON CONFLICT (seed_id) DO UPDATE SET
  surname = EXCLUDED.surname,
  firstname = EXCLUDED.firstname,
  title = EXCLUDED.title,
  sex = EXCLUDED.sex,
  date_of_birth = EXCLUDED.date_of_birth,
  address = EXCLUDED.address,
  suburb = EXCLUDED.suburb,
  postcode = EXCLUDED.postcode,
  phone = EXCLUDED.phone,
  medicare_card = EXCLUDED.medicare_card,
  medicare_valid_to = EXCLUDED.medicare_valid_to,
  concession_type = EXCLUDED.concession_type,
  concession_number = EXCLUDED.concession_number,
  allergies = EXCLUDED.allergies,
  patient_notes = EXCLUDED.patient_notes;

INSERT INTO drugs
  (seed_id, generic_name, brand_name, full_display_name, form, strength, pack_size, qty_default,
   repeats_default, supply_type, schedule, pbs_code, ws_cost, retail_price, manufacturer_code,
   manufacturer_full, is_generic, cmi_available)
VALUES
  ('oxycontin-mr-tab-20', 'OXYCODONE', 'OXYCONTIN', 'OXYCONTIN MR TAB 20MG', 'MR TAB', '20MG', '28', 28, 0, 'AUTHORITY', 'S8', NULL, 18.20, 7.70, 'MU', 'Mundipharma Pty Ltd', false, true),
  ('oxycodone-generic-mr-tab-20', 'OXYCODONE', NULL, 'OXYCODONE MR TAB 20MG', 'MR TAB', '20MG', '28', 28, 0, 'AUTHORITY', 'S8', NULL, 14.80, 7.70, 'GN', 'Generic Health Pty Ltd', true, true),
  ('durogesic-patch-25', 'FENTANYL', 'DUROGESIC', 'DUROGESIC PATCH 25MCG/H', 'PATCH', '25MCG/H', '5', 5, 0, 'AUTHORITY', 'S8', NULL, 22.00, 7.70, 'JC', 'Janssen-Cilag Pty Ltd', false, true),
  ('fentanyl-sandoz-patch-25', 'FENTANYL', 'SANDOZ', 'FENTANYL SANDOZ PATCH 25MCG/H', 'PATCH', '25MCG/H', '5', 5, 0, 'AUTHORITY', 'S8', NULL, 18.40, 7.70, 'SZ', 'Sandoz Pty Ltd', false, true),
  ('aspen-dexamfetamine-tab-5', 'DEXAMFETAMINE', 'ASPEN', 'ASPEN DEXAMFETAMINE TAB 5MG', 'TAB', '5MG', '100', 100, 0, 'AUTHORITY', 'S8', NULL, 13.20, 7.70, 'AP', 'Aspen Pharmacare Australia Pty Ltd', false, true),
  ('dexamfetamine-genpar-tab-5', 'DEXAMFETAMINE', 'GENPAR', 'DEXAMFETAMINE GENPAR TAB 5MG', 'TAB', '5MG', '100', 100, 0, 'AUTHORITY', 'S8', NULL, 11.40, 7.70, 'AR', 'Arrotex Pharmaceuticals Pty Ltd', false, true),
  ('methotrexate-cipla-tab-10', 'METHOTREXATE', 'CIPLA', 'METHOTREXATE CIPLA TAB 10MG', 'TAB', '10MG', '15', 12, 2, 'NHS', 'S4', NULL, 8.30, 7.70, 'CP', 'Cipla Australia Pty Ltd', false, true),
  ('methotrexate-generic-tab-10', 'METHOTREXATE', NULL, 'METHOTREXATE TAB 10MG', 'TAB', '10MG', '15', 12, 2, 'NHS', 'S4', NULL, 7.10, 7.70, 'GN', 'Generic Health Pty Ltd', true, true),
  ('quilonum-sr-tab-450', 'LITHIUM CARBONATE', 'QUILONUM SR', 'QUILONUM SR TAB 450MG', 'SR TAB', '450MG', '100', 100, 2, 'NHS', 'S4', NULL, 10.90, 7.70, 'GK', 'GlaxoSmithKline Australia Pty Ltd', false, true),
  ('lithicarb-tab-250', 'LITHIUM CARBONATE', 'LITHICARB', 'LITHICARB TAB 250MG', 'TAB', '250MG', '100', 100, 2, 'NHS', 'S4', NULL, 9.20, 7.70, 'AR', 'Arrotex Pharmaceuticals Pty Ltd', false, true),
  ('eliquis-tab-5', 'APIXABAN', 'ELIQUIS', 'ELIQUIS TAB 5MG', 'TAB', '5MG', '60', 60, 5, 'NHS', 'S4', NULL, 35.40, 7.70, 'BM', 'Bristol-Myers Squibb Australia Pty Ltd', false, true),
  ('apo-apixaban-tab-5', 'APIXABAN', 'APO', 'APO-APIXABAN TAB 5MG', 'TAB', '5MG', '60', 60, 5, 'NHS', 'S4', NULL, 28.20, 7.70, 'AR', 'Arrotex Pharmaceuticals Pty Ltd', false, true)
ON CONFLICT (seed_id) DO UPDATE SET
  generic_name = EXCLUDED.generic_name,
  brand_name = EXCLUDED.brand_name,
  full_display_name = EXCLUDED.full_display_name,
  form = EXCLUDED.form,
  strength = EXCLUDED.strength,
  pack_size = EXCLUDED.pack_size,
  qty_default = EXCLUDED.qty_default,
  repeats_default = EXCLUDED.repeats_default,
  supply_type = EXCLUDED.supply_type,
  schedule = EXCLUDED.schedule,
  pbs_code = EXCLUDED.pbs_code,
  ws_cost = EXCLUDED.ws_cost,
  retail_price = EXCLUDED.retail_price,
  manufacturer_code = EXCLUDED.manufacturer_code,
  manufacturer_full = EXCLUDED.manufacturer_full,
  is_generic = EXCLUDED.is_generic,
  cmi_available = EXCLUDED.cmi_available;

WITH scripted(seed_id, script_date, drug, qty, repeats, rx_number) AS (
  VALUES
    ('patient-peter-morales-richmond', '17/06/26', 'OXYCONTIN MR TAB 20mg', '28', 0, 'S8-7741'),
    ('patient-peter-morales-richmond', '20/05/26', 'OXYCONTIN MR TAB 20mg', '28', 0, 'S8-7480'),
    ('patient-peter-morales-richmond', '20/05/26', 'OXYCODONE IR TAB 5mg', '20', 0, 'S8-7481'),
    ('patient-helen-brooks-kew', '03/07/26', 'PARACETAMOL TAB 500mg', '100', 2, '6112'),
    ('patient-noah-williams-brunswick', '18/06/26', 'ASPEN DEXAMFETAMINE TAB 5mg', '100', 0, 'S8-8201'),
    ('patient-noah-williams-brunswick', '19/05/26', 'ASPEN DEXAMFETAMINE TAB 5mg', '100', 0, 'S8-7940'),
    ('patient-grace-lim-box-hill', '21/06/26', 'METHOTREXATE TAB 10mg — once weekly', '12', 2, '7012'),
    ('patient-grace-lim-box-hill', '21/06/26', 'FOLIC ACID TAB 5mg', '20', 5, '7013'),
    ('patient-rahul-mehta-footscray', '15/06/26', 'QUILONUM SR TAB 450mg', '100', 2, '7182'),
    ('patient-rahul-mehta-footscray', '12/07/26', 'IBUPROFEN TAB 400mg', '30', 0, '7241'),
    ('patient-evelyn-scott-camberwell', '16/06/26', 'ELIQUIS TAB 2.5mg', '60', 5, '7318'),
    ('patient-evelyn-scott-camberwell', '16/06/26', 'NAPROXEN TAB 500mg', '50', 1, '7319')
)
INSERT INTO patient_scripts (patient_id, script_date, drug, qty, repeats, rx_number)
SELECT p.id, s.script_date, s.drug, s.qty, s.repeats, s.rx_number
FROM scripted s
JOIN patients p ON p.seed_id = s.seed_id
ON CONFLICT (patient_id, script_date, drug) DO UPDATE SET
  qty = EXCLUDED.qty,
  repeats = EXCLUDED.repeats,
  rx_number = EXCLUDED.rx_number;


-- 0009_multi_item_case.sql
-- Case 13: a two-item PBS prescription (metformin XR + sitagliptin).
-- Adds the prescriber, patient and products the case selects from.

INSERT INTO prescribers
  (seed_id, title, surname, firstname, prescriber_number, practice_name, address, suburb, state, postcode, phone)
VALUES
  ('prescriber-reed-elliot', 'DR', 'REED', 'ELLIOT', '7399488', 'Sacred Heart General Practice', '2 ANGAS STREET', 'ADELAIDE', 'SA', '5000', '(08) 8586 0440')
ON CONFLICT (prescriber_number) DO UPDATE SET
  seed_id = EXCLUDED.seed_id,
  title = EXCLUDED.title,
  surname = EXCLUDED.surname,
  firstname = EXCLUDED.firstname,
  practice_name = EXCLUDED.practice_name,
  address = EXCLUDED.address,
  suburb = EXCLUDED.suburb,
  state = EXCLUDED.state,
  postcode = EXCLUDED.postcode,
  phone = EXCLUDED.phone;

INSERT INTO patients
  (seed_id, surname, firstname, title, sex, date_of_birth, address, suburb, postcode, phone,
   medicare_card, medicare_valid_to, concession_type, concession_number, allergies, patient_notes)
VALUES
  ('patient-christopher-carruthers-adelaide', 'CARRUTHERS', 'CHRISTOPHER', 'MR', 'M', '1978-01-08',
   '173 OAKENDON STREET', 'ADELAIDE', '5000', '(08) 8211 4477',
   '3656-55648-8', '12/2028', NULL, NULL, ARRAY[]::text[],
   'Type 2 diabetes — metformin XR and sitagliptin'),
  ('patient-christine-carruthers-adelaide', 'CARRUTHERS', 'CHRISTINE', 'MS', 'F', '1981-06-23',
   '173 OAKENDON STREET', 'ADELAIDE', '5000', '(08) 8211 4477',
   '3656-55648-9', '12/2028', NULL, NULL, ARRAY['METFORMIN (severe GI upset)']::text[],
   NULL)
ON CONFLICT (seed_id) DO UPDATE SET
  surname = EXCLUDED.surname,
  firstname = EXCLUDED.firstname,
  title = EXCLUDED.title,
  sex = EXCLUDED.sex,
  date_of_birth = EXCLUDED.date_of_birth,
  address = EXCLUDED.address,
  suburb = EXCLUDED.suburb,
  postcode = EXCLUDED.postcode,
  phone = EXCLUDED.phone,
  medicare_card = EXCLUDED.medicare_card,
  medicare_valid_to = EXCLUDED.medicare_valid_to,
  allergies = EXCLUDED.allergies,
  patient_notes = EXCLUDED.patient_notes;

INSERT INTO drugs
  (seed_id, generic_name, brand_name, full_display_name, form, strength, pack_size, qty_default,
   repeats_default, supply_type, schedule, pbs_code, ws_cost, retail_price, manufacturer_code,
   manufacturer_full, is_generic, cmi_available)
VALUES
  ('metex-xr-tab-500', 'METFORMIN', 'METEX XR', 'METEX XR ER TAB 500MG', 'ER TAB', '500MG', '120', 120, 5, 'NHS', 'S4', '9435N', 12.40, 22.10, 'AR', 'Arrotex Pharmaceuticals Pty Ltd', false, true),
  ('diabex-xr-tab-500', 'METFORMIN', 'DIABEX XR', 'DIABEX XR ER TAB 500MG', 'ER TAB', '500MG', '120', 120, 5, 'NHS', 'S4', '9435N', 13.10, 22.10, 'AL', 'Alphapharm Pty Ltd', false, true),
  ('metex-xr-tab-1000', 'METFORMIN', 'METEX XR', 'METEX XR ER TAB 1000MG', 'ER TAB', '1000MG', '60', 60, 5, 'NHS', 'S4', '9436P', 14.90, 22.10, 'AR', 'Arrotex Pharmaceuticals Pty Ltd', false, true),
  ('januvia-tab-100', 'SITAGLIPTIN', 'JANUVIA', 'JANUVIA TAB 100MG', 'TAB', '100MG', '28', 28, 5, 'AUTHORITY', 'S4', '11576G', 21.60, 30.00, 'MK', 'Merck Sharp & Dohme (Australia) Pty Ltd', false, true),
  ('sitagliptin-apo-tab-100', 'SITAGLIPTIN', 'APO', 'SITAGLIPTIN (APO) TAB 100MG', 'TAB', '100MG', '28', 28, 5, 'AUTHORITY', 'S4', '11576G', 15.20, 30.00, 'TX', 'Apotex Pty Ltd', true, true),
  ('januvia-tab-50', 'SITAGLIPTIN', 'JANUVIA', 'JANUVIA TAB 50MG', 'TAB', '50MG', '28', 28, 5, 'AUTHORITY', 'S4', '11577H', 21.60, 30.00, 'MK', 'Merck Sharp & Dohme (Australia) Pty Ltd', false, true),
  ('janumet-xr-tab-50-1000', 'SITAGLIPTIN WITH METFORMIN', 'JANUMET XR', 'JANUMET XR ER TAB 50MG/1000MG', 'ER TAB', '50MG/1000MG', '56', 56, 5, 'AUTHORITY', 'S4', '10476Q', 26.40, 30.00, 'MK', 'Merck Sharp & Dohme (Australia) Pty Ltd', false, true)
ON CONFLICT (seed_id) DO UPDATE SET
  generic_name = EXCLUDED.generic_name,
  brand_name = EXCLUDED.brand_name,
  full_display_name = EXCLUDED.full_display_name,
  form = EXCLUDED.form,
  strength = EXCLUDED.strength,
  pack_size = EXCLUDED.pack_size,
  qty_default = EXCLUDED.qty_default,
  repeats_default = EXCLUDED.repeats_default,
  supply_type = EXCLUDED.supply_type,
  schedule = EXCLUDED.schedule,
  pbs_code = EXCLUDED.pbs_code,
  ws_cost = EXCLUDED.ws_cost,
  retail_price = EXCLUDED.retail_price,
  manufacturer_code = EXCLUDED.manufacturer_code,
  manufacturer_full = EXCLUDED.manufacturer_full,
  is_generic = EXCLUDED.is_generic,
  cmi_available = EXCLUDED.cmi_available;


-- 0010_repeat_timing_history.sql
-- Patient dispensing history that lets a repeat script be checked for timing:
-- the student must compare the quantity/directions of the last supply (days'
-- supply) against how long ago it was actually dispensed, before repeating it.
-- Safe to run repeatedly in the Supabase SQL Editor.

WITH scripted(seed_id, script_date, drug, qty, repeats, rx_number) AS (
  VALUES
    -- Case 1 (Erythromycin, script date 27/06/17): a 25-capsule course taken
    -- three times daily lasts ~8 days. Last supplied 23/06/17 — only 4 days
    -- ago. Too early; the correct decision is to hold and contact prescriber.
    ('patient-john-smith-abbotsford', '23/06/17', 'ERYTHROMYCIN (MAYNE PHARMA) CAP 250mg', '25', 1, '5001'),

    -- Case 5 (Metformin, script date 27/06/17): 60 tablets at twice daily
    -- lasts ~30 days. Last supplied 25/05/17 — 33 days ago. Correctly due.
    ('patient-carol-simmons-carlton', '25/05/17', 'METFORMIN (AN) TAB 1000mg', '60', 5, '5002'),

    -- Case 13 (Metformin XR + Sitagliptin, script date 18/08/25): metformin XR
    -- (4 tabs daily, 120 tabs = ~30 days) and sitagliptin (1 tab daily, 28
    -- tabs = 28 days) were both last supplied 10/07/25 — 39 days ago.
    -- Correctly due for both items.
    ('patient-christopher-carruthers-adelaide', '10/07/25', 'METEX XR ER TAB 500mg', '120', 5, '5003'),
    ('patient-christopher-carruthers-adelaide', '10/07/25', 'JANUVIA TAB 100mg', '28', 5, '5004')
)
INSERT INTO patient_scripts (patient_id, script_date, drug, qty, repeats, rx_number)
SELECT p.id, s.script_date, s.drug, s.qty, s.repeats, s.rx_number
FROM scripted s
JOIN patients p ON p.seed_id = s.seed_id
ON CONFLICT (patient_id, script_date, drug) DO UPDATE SET
  qty = EXCLUDED.qty,
  repeats = EXCLUDED.repeats,
  rx_number = EXCLUDED.rx_number;


-- 0011_profiles_role_and_entitlement_guard.sql
-- Entitlement model for the paid launch.
--  1. Adds profiles.role ('student' default; set 'admin' by hand for developers).
--  2. Locks the privileged columns (has_paid, role, trial_cases_used) so a
--     signed-in user can never grant themselves paid access from the browser —
--     only server/service-role code (the payment webhook) may change them.
-- Idempotent: safe to run more than once.

alter table public.profiles
  add column if not exists role text not null default 'student';

-- A regular signed-in request carries auth.uid(); service-role / server contexts
-- do not. If a normal user tries to change any entitlement column, silently
-- revert it to its stored value. The payment webhook runs with the service-role
-- key (auth.uid() is null) and passes through.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.has_paid := old.has_paid;
  new.role := old.role;
  new.trial_cases_used := old.trial_cases_used;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;

create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged_columns();


-- 0012_stripe_customer.sql
-- Stripe subscription support.
--  1. Stores the Stripe customer id on the profile so subscription lifecycle
--     events (cancel / lapse) can be mapped back to the right user.
--  2. Extends the entitlement guard so a signed-in user cannot spoof their
--     stripe_customer_id either — only the service-role webhook may set it.
-- Idempotent: safe to run more than once. Requires 0011 to have run first.

alter table public.profiles
  add column if not exists stripe_customer_id text;

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.has_paid := old.has_paid;
  new.role := old.role;
  new.trial_cases_used := old.trial_cases_used;
  new.stripe_customer_id := old.stripe_customer_id;
  return new;
end;
$$;

-- The BEFORE UPDATE trigger created in 0011 already points at this function;
-- recreating the function above is sufficient.


-- 0013_launch_billing_and_profile_hardening.sql
-- Customer-launch hardening for subscription state, retry-safe webhook logging,
-- and inclusive study-stage profile data. Apply before enabling paid checkout.

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_plan text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_start timestamptz,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false,
  add column if not exists subscription_updated_at timestamptz,
  add column if not exists study_stage text;

create unique index if not exists profiles_stripe_customer_id_unique
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_unique
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  object_id text,
  status text not null check (status in ('processing', 'processed', 'failed')),
  attempts integer not null default 1,
  error_message text,
  received_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.stripe_webhook_events enable row level security;

-- No client policies are created: only the service-role webhook can read or
-- write the delivery log.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  new.has_paid := old.has_paid;
  new.role := old.role;
  new.trial_cases_used := old.trial_cases_used;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.subscription_plan := old.subscription_plan;
  new.subscription_status := old.subscription_status;
  new.subscription_current_period_start := old.subscription_current_period_start;
  new.subscription_current_period_end := old.subscription_current_period_end;
  new.subscription_cancel_at_period_end := old.subscription_cancel_at_period_end;
  new.subscription_updated_at := old.subscription_updated_at;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  numeric_year integer;
begin
  if (new.raw_user_meta_data ->> 'study_stage') in ('year_1', 'year_2', 'year_3', 'year_4') then
    numeric_year := right(new.raw_user_meta_data ->> 'study_stage', 1)::integer;
  else
    numeric_year := null;
  end if;

  insert into public.profiles (
    id, email, full_name, university, year_of_study, study_stage
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'university', ''),
    numeric_year,
    nullif(new.raw_user_meta_data ->> 'study_stage', '')
  );
  return new;
end;
$$;


-- 0014_server_assessment.sql

revoke all on public.patients, public.patient_scripts, public.drugs, public.prescribers from anon;
revoke insert, update, delete, truncate, references, trigger on public.patients, public.patient_scripts, public.drugs, public.prescribers from authenticated;
grant select on public.patients, public.patient_scripts, public.drugs, public.prescribers to authenticated;
revoke insert, update, delete on public.attempts from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, university, year_of_study, study_stage) on public.profiles to authenticated;

-- Also protect columns if a broad table grant is accidentally restored.
create or replace function public.protect_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or current_setting('role', true) = 'postgres' then return new; end if;
  if (to_jsonb(new) - array['full_name','university','year_of_study','study_stage'])
     is distinct from (to_jsonb(old) - array['full_name','university','year_of_study','study_stage']) then
    raise exception 'Only personal profile fields may be edited';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_privileged_columns on public.profiles;
drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger protect_profile_privileged_columns before update on public.profiles
for each row execute function public.protect_profile_privileged_columns();

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null, case_version text not null,
  seed bigint not null check (seed >= 0),
  mode text not null check (mode in ('learn', 'practice', 'exam')),
  assisted boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.practice_sessions enable row level security;
revoke all on public.practice_sessions from anon, authenticated;
grant all on public.practice_sessions to service_role;
create index if not exists practice_sessions_user_created on public.practice_sessions(user_id, created_at desc);

create table if not exists public.operation_locks (
  key text primary key, owner uuid not null, expires_at timestamptz not null
);
alter table public.operation_locks enable row level security;
revoke all on public.operation_locks from anon, authenticated;
create or replace function public.acquire_operation_lock(lock_key text, lock_owner uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare acquired text;
begin
  insert into public.operation_locks(key, owner, expires_at) values(lock_key, lock_owner, now() + interval '5 minutes')
  on conflict(key) do update set owner = excluded.owner, expires_at = excluded.expires_at
  where operation_locks.expires_at < now() returning key into acquired;
  return acquired is not null;
end; $$;
create or replace function public.release_operation_lock(lock_key text, lock_owner uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.operation_locks where key = lock_key and owner = lock_owner;
$$;
revoke all on function public.acquire_operation_lock(text, uuid), public.release_operation_lock(text, uuid) from public, anon, authenticated;
grant execute on function public.acquire_operation_lock(text, uuid), public.release_operation_lock(text, uuid) to service_role;

-- Historical client scores are retained but not represented as verified.
alter table public.attempts add column if not exists server_verified boolean not null default false;


-- 0015_remove_anon_directory_access.sql
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


-- 0016_account_support_and_quizzes.sql

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('content','bug','privacy','other')), case_id text,
  message text not null check (length(message) between 10 and 4000),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant all on public.feedback to service_role;
create table if not exists public.quiz_attempts (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  case_id text not null, version text not null, mode text not null check (mode in ('practice','challenge')),
  answers jsonb not null, percentage integer not null check (percentage between 0 and 100),
  created_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;
revoke all on public.quiz_attempts from anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
drop policy if exists "quiz attempts own read" on public.quiz_attempts;
create policy "quiz attempts own read" on public.quiz_attempts for select to authenticated using (auth.uid() = user_id);
create index if not exists quiz_attempts_user_created on public.quiz_attempts(user_id, created_at desc);

create table if not exists public.request_limits (key text primary key, count integer not null, expires_at timestamptz not null);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from anon, authenticated;
create or replace function public.consume_request_limit(request_key text, maximum integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  delete from public.request_limits where expires_at < now() - interval '1 day';
  insert into public.request_limits values(request_key, 1, now() + interval '1 hour')
  on conflict(key) do update set count = case when request_limits.expires_at < now() then 1 else request_limits.count + 1 end,
    expires_at = case when request_limits.expires_at < now() then now() + interval '1 hour' else request_limits.expires_at end
  returning count into used;
  return used <= maximum;
end; $$;
revoke all on function public.consume_request_limit(text, integer) from public, anon, authenticated;
grant execute on function public.consume_request_limit(text, integer) to service_role;


-- 0017_launch_health.sql

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

COMMIT;