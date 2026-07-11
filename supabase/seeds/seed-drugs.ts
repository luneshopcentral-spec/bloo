/**
 * Idempotent drug seed script.
 * Run: npm run seed:drugs
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and either
 * SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { DRUG_LIBRARY } from "./drug-library";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or key in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  let upsertedCount = 0;

  for (const drug of DRUG_LIBRARY) {
    const { error } = await supabase
      .from("drugs")
      .upsert(
        {
          seed_id:           drug.seed_id,
          generic_name:      drug.generic_name,
          brand_name:        drug.brand_name,
          full_display_name: drug.full_display_name,
          form:              drug.form,
          strength:          drug.strength,
          pack_size:         drug.pack_size,
          qty_default:       drug.qty_default,
          repeats_default:   drug.repeats_default,
          supply_type:       drug.supply_type,
          schedule:          drug.schedule,
          pbs_code:          drug.pbs_code,
          ws_cost:           drug.ws_cost,
          retail_price:      drug.retail_price,
          manufacturer_code: drug.manufacturer_code,
          manufacturer_full: drug.manufacturer_full,
          is_generic:        drug.is_generic,
          cmi_available:     drug.cmi_available,
        },
        { onConflict: "seed_id" }
      );

    if (error) {
      console.error(`Failed to upsert ${drug.seed_id}:`, error.message);
    } else {
      upsertedCount++;
    }
  }

  console.log(`Seeded ${upsertedCount}/${DRUG_LIBRARY.length} drugs.`);
  console.log(`Run SELECT count(*) FROM drugs; to verify.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
