import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile, error } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (error) return NextResponse.json({ error: "Export unavailable" }, { status: 503 });
  const output: Record<string, unknown> = { exportedAt: new Date().toISOString(), profile };
  for (const table of ["attempts", "quiz_attempts", "feedback"] as const) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error: readError } = await admin.from(table).select("*").eq("user_id", user.id).order("created_at").order("id").range(offset, offset + 499);
      if (readError) return NextResponse.json({ error: "Export unavailable. Please retry." }, { status: 503 });
      rows.push(...(data ?? [])); if (!data || data.length < 500) break;
    }
    output[table] = rows;
  }
  return NextResponse.json(output, { headers: { "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="dispenserx-account.json"' } });
}
