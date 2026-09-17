import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  let ready = false;
  try {
    const { data, error } = await createAdminClient().rpc("launch_schema_ready", {}).abortSignal(AbortSignal.timeout(5000));
    ready = !error && data === true;
  } catch { /* Do not expose credentials, table names or provider errors. */ }
  return NextResponse.json(
    {
      status: ready ? "ok" : "unavailable",
      service: "dispense-rx-practice",
      checkedAt: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
