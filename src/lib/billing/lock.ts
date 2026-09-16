import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function withBillingLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  const admin = createAdminClient();
  const args = { lock_key: key, lock_owner: randomUUID() };
  const { data, error } = await admin.rpc("acquire_operation_lock", args);
  if (error || !data) throw new Error("Billing is busy or unavailable; retry this operation");
  try { return await work(); }
  finally {
    const { error: releaseError } = await admin.rpc("release_operation_lock", args);
    if (releaseError) console.error("Billing lock release failed", { key });
  }
}
