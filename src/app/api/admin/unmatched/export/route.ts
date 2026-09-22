import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Always quote; double embedded quotes. Guards against CSV injection too.
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    await requireAdmin("api");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const unreviewedOnly = new URL(request.url).searchParams.get("view") === "unreviewed";
  const admin = createAdminClient();
  let query = admin
    .from("unmatched_utterances")
    .select("created_at, case_id, stage, reviewed, text, patient_reply")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (unreviewedOnly) query = query.eq("reviewed", false);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Export unavailable" }, { status: 503 });

  const header = ["created_at", "case_id", "stage", "reviewed", "text", "patient_reply"];
  const lines = [header.map(csvCell).join(",")];
  for (const row of data ?? []) {
    lines.push([row.created_at, row.case_id, row.stage, row.reviewed, row.text, row.patient_reply].map(csvCell).join(","));
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM for Excel

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="unmatched-wording-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
