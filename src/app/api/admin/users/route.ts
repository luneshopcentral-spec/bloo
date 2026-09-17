import { userActionSchema, manageAccess } from "@/lib/admin/access";
export const runtime = "nodejs";
export async function POST(request: Request) { return manageAccess(request, userActionSchema); }
