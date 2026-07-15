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
