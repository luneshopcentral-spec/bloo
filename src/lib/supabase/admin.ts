import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role Supabase client. Bypasses Row Level Security and the profile
 * entitlement-guard trigger, so it is the ONLY code path that may set
 * `has_paid` / `stripe_customer_id`. Server-only — never import into a
 * component that ships to the browser (it reads the service-role key).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE service-role env not set (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
