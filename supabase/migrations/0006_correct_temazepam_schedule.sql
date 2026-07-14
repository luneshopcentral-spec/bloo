-- Correct the historical training seed. Temazepam is Schedule 4 and is
-- monitored in SafeScript in Victoria; SafeScript monitoring does not make it
-- a Schedule 8 medicine.
UPDATE public.drugs
SET schedule = 'S4'
WHERE UPPER(generic_name) = 'TEMAZEPAM'
  AND schedule IS DISTINCT FROM 'S4';
