import { NextResponse } from "next/server";
import { checkoutAvailability, paidAccessAvailable } from "@/lib/governance/availability";
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json({ paidAccess: paidAccessAvailable(), ...checkoutAvailability() }, { headers: { "Cache-Control": "no-store" } }); }
