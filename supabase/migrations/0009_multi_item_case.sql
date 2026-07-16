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
