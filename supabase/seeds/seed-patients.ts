/**
 * Idempotent patient seed script.
 * Run: npm run seed:patients
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   (use service role to bypass RLS)
 *
 * All data is fictional practice fixtures — no real PII.
 */
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { ALL_PATIENTS } from "./patient-library";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Historical scripts keyed by seed_id → array of script rows
const PATIENT_SCRIPTS: Record<
  string,
  Array<{ script_date: string; drug: string; qty: string; repeats: number; rx_number: string }>
> = {
  "patient-john-smith-abbotsford": [
    { script_date: "20/03/17", drug: "SIMVASTATIN (AN) TAB 10mg", qty: "30", repeats: 5, rx_number: "1083" },
    { script_date: "15/01/17", drug: "AMLODIPINE TAB 5mg", qty: "30", repeats: 5, rx_number: "987" },
  ],
  "patient-margaret-jones-fitzroy": [
    { script_date: "01/06/17", drug: "WARFARIN TAB 5mg", qty: "30", repeats: 0, rx_number: "2201" },
    { script_date: "01/05/17", drug: "WARFARIN TAB 5mg", qty: "30", repeats: 0, rx_number: "2198" },
    { script_date: "01/04/17", drug: "WARFARIN TAB 5mg", qty: "30", repeats: 0, rx_number: "2189" },
  ],
  "patient-david-park-hawthorn": [
    { script_date: "15/03/17", drug: "TEMAZEPAM TAB 10mg", qty: "30", repeats: 0, rx_number: "P-441" },
    { script_date: "10/01/17", drug: "TEMAZEPAM TAB 10mg", qty: "30", repeats: 0, rx_number: "P-398" },
  ],
  "patient-carol-simmons-carlton": [
    { script_date: "01/06/17", drug: "METFORMIN TAB 500mg", qty: "60", repeats: 5, rx_number: "3301" },
    { script_date: "01/06/17", drug: "RAMIPRIL TAB 5mg", qty: "56", repeats: 2, rx_number: "3302" },
    { script_date: "20/06/17", drug: "CIMETIDINE TAB 400mg", qty: "28", repeats: 0, rx_number: "3389" },
  ],
  "patient-john-smith-richmond": [
    { script_date: "10/05/17", drug: "ATORVASTATIN TAB 20mg", qty: "30", repeats: 5, rx_number: "4001" },
  ],
  "patient-fred-health": [
    { script_date: "01/03/17", drug: "LISINOPRIL TAB 10mg", qty: "30", repeats: 5, rx_number: "5001" },
    { script_date: "15/04/17", drug: "ASPIRIN TAB 100mg", qty: "30", repeats: 11, rx_number: "5002" },
  ],
};

async function run() {
  let upsertedCount = 0;
  let scriptCount = 0;

  for (const patient of ALL_PATIENTS) {
    const { data, error } = await supabase
      .from("patients")
      .upsert(
        {
          seed_id: patient.seed_id,
          surname: patient.surname,
          firstname: patient.firstname,
          title: patient.title,
          sex: patient.sex,
          date_of_birth: patient.date_of_birth,
          address: patient.address,
          suburb: patient.suburb,
          postcode: patient.postcode,
          phone: patient.phone,
          medicare_card: patient.medicare_card,
          medicare_valid_to: patient.medicare_valid_to,
          concession_type: patient.concession_type,
          concession_number: patient.concession_number,
          allergies: patient.allergies,
          patient_notes: patient.patient_notes,
        },
        { onConflict: "seed_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error(`Failed to upsert ${patient.seed_id}:`, error.message);
      continue;
    }

    upsertedCount++;
    const patientId = data.id;
    const scripts = PATIENT_SCRIPTS[patient.seed_id];
    if (!scripts) continue;

    for (const script of scripts) {
      const { error: sErr } = await supabase.from("patient_scripts").upsert(
        { patient_id: patientId, ...script },
        { onConflict: "patient_id,script_date,drug" }
      );
      if (sErr) {
        console.error(`  Failed script for ${patient.seed_id}:`, sErr.message);
      } else {
        scriptCount++;
      }
    }
  }

  console.log(`Seeded ${upsertedCount}/${ALL_PATIENTS.length} patients, ${scriptCount} scripts.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
