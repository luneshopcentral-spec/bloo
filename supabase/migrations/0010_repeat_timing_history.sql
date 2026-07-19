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
