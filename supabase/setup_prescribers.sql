-- Paste into the Supabase SQL Editor once before deploying this phase.
-- Safe to run repeatedly.
-- All seeded names and contact details are fictional training data.

CREATE TABLE IF NOT EXISTS prescribers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id           text        UNIQUE,
  title             text,
  surname           text        NOT NULL,
  firstname         text        NOT NULL,
  prescriber_number text        UNIQUE NOT NULL,
  practice_name     text,
  address           text,
  suburb            text,
  state             text,
  postcode          text,
  phone             text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescribers_surname ON prescribers (lower(surname));
CREATE INDEX IF NOT EXISTS idx_prescribers_number ON prescribers (prescriber_number);
ALTER TABLE prescribers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescribers' AND policyname = 'Authenticated users can read prescribers') THEN
    CREATE POLICY "Authenticated users can read prescribers" ON prescribers FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescribers' AND policyname = 'Authenticated users can insert prescribers') THEN
    CREATE POLICY "Authenticated users can insert prescribers" ON prescribers FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- The practice page is authenticated. Remove earlier permissive policies if
-- this setup file was trialled before the authenticated-only policy shipped.
DROP POLICY IF EXISTS "Anon can read prescribers" ON prescribers;
DROP POLICY IF EXISTS "Anon can insert prescribers" ON prescribers;

INSERT INTO prescribers
  (seed_id, title, surname, firstname, prescriber_number, practice_name, address, suburb, state, postcode, phone)
VALUES
  ('prescriber-willis-harry', 'DR', 'WILLIS', 'HARRY', '8015996', 'Harbour Family Practice', '15 MARKET STREET', 'SYDNEY', 'NSW', '2000', '(02) 9000 1101'),
  ('prescriber-chen-linda', 'DR', 'CHEN', 'LINDA', '7029384', 'Northside Medical Centre', '20 MILLER STREET', 'NORTH SYDNEY', 'NSW', '2060', '(02) 9000 1102'),
  ('prescriber-watson-emily', 'DR', 'WATSON', 'EMILY', '3847291', 'Henderson Road Medical', '8 HENDERSON ROAD', 'NORTHCOTE', 'VIC', '3070', '(03) 9000 1103'),
  ('prescriber-kowalski-anna', 'DR', 'KOWALSKI', 'ANNA', '9012847', 'Park Health Clinic', '11 PARK AVENUE', 'RICHMOND', 'VIC', '3121', '(03) 9000 1104'),
  ('prescriber-yuen-richard', 'DR', 'YUEN', 'RICHARD', '5512847', 'Central Diabetes Clinic', '32 GEORGE STREET', 'PARRAMATTA', 'NSW', '2150', '(02) 9000 1105'),
  ('prescriber-bradley-tom', 'DR', 'BRADLEY', 'TOM', '6623941', 'Chapel Street Medical', '19 CHAPEL STREET', 'PRAHRAN', 'VIC', '3181', '(03) 9000 1106'),
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
