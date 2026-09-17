import { z } from "zod";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminAuthError, requireAdminMutation } from "./guard";
import type { Json } from "@/lib/types/database";

const duration = z.number().int().min(15).max(525600);
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9-]{2,31}$/, "Use 3–32 letters, numbers or dashes.");
export const codeActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    code,
    description: z.string().trim().max(200).optional(),
    grantsMinutes: duration,
    maxRedemptions: z.number().int().min(1).max(100000).nullable(),
    expiresAt: z
      .string()
      .datetime()
      .refine(
        (value) => Date.parse(value) > Date.now(),
        "Expiry must be in the future.",
      )
      .nullable(),
    assignedEmail: z.string().trim().toLowerCase().email().max(254).nullable(),
  }),
  z.object({ action: z.literal("set_active"), code, active: z.boolean() }),
]);
export const userActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_role"),
    userId: z.string().uuid(),
    role: z.enum(["admin", "student"]),
  }),
  z.object({
    action: z.literal("grant_comp"),
    userId: z.string().uuid(),
    minutes: duration,
  }),
  z.object({ action: z.literal("revoke_comp"), userId: z.string().uuid() }),
  z.object({ action: z.literal("reset_progress"), userId: z.string().uuid() }),
]);

export async function manageAccess(
  request: Request,
  schema: typeof codeActionSchema | typeof userActionSchema,
) {
  try {
    const actor = await requireAdminMutation(request);
    const text = await request.text();
    if (text.length > 20000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    const { data, error } = await createAdminClient().rpc(
      "admin_manage_access",
      { actor_id: actor.id, operation: parsed.data as Json },
    );
    if (error) {
      const known: Record<string, [number, string]> = {
        "target not found": [404, "That account or code no longer exists."],
        "cannot demote self": [400, "You cannot remove your own admin access."],
        "not authorised": [403, "Administrator access is required."],
        "invalid expiry": [400, "Expiry must be in the future."],
      };
      const [status, message] =
        error.code === "23505"
          ? [409, "That code already exists."]
          : (known[error.message] ?? [
              503,
              "The change could not be saved. Check database readiness and try again.",
            ]);
      return NextResponse.json({ error: message }, { status: Number(status) });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AdminAuthError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Admin service unavailable. Please try again." },
      { status: 503 },
    );
  }
}
