import { NextResponse } from "next/server";
import { paidAccessAvailable } from "@/lib/governance/availability";
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json({ paidAccess: paidAccessAvailable() }, { headers: { "Cache-Control": "no-store" } }); }
