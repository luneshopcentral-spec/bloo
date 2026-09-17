import { createAdminClient } from "@/lib/supabase/admin";

// Operational settings the admin portal can toggle at runtime. Each key is
// declared here with a default so the app has defined behaviour before anything
// is written, and so the settings UI knows what to render. Add a key here, wire
// its default, and it becomes editable.
export interface AdminSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
}

export const SETTING_DEFAULTS: AdminSettings = {
  maintenance_mode: false,
  maintenance_message: "We're doing scheduled maintenance and will be back shortly.",
};

export const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as (keyof AdminSettings)[];

/** Load all settings, merged over defaults. Never throws — a missing table or a
 * read error falls back to defaults so the app keeps working. */
export async function loadSettings(): Promise<AdminSettings> {
  const merged: AdminSettings = { ...SETTING_DEFAULTS };
  try {
    const { data } = await createAdminClient().from("admin_settings").select("key, value");
    for (const row of data ?? []) {
      if ((SETTING_KEYS as string[]).includes(row.key)) {
        // Values are stored as JSON of the correct primitive type.
        (merged as unknown as Record<string, unknown>)[row.key] = row.value;
      }
    }
  } catch {
    // fall back to defaults
  }
  return merged;
}
