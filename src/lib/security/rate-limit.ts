import { createAdminClient } from "@/lib/supabase/admin";
export async function allowRequest(userId: string, action: string, maximum: number) {
  const { data, error } = await createAdminClient().rpc("consume_request_limit", { request_key: `${action}:${userId}`, maximum });
  return !error && data === true;
}
