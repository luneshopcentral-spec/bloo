// Server-only module: imports the service-role admin client. Never import from a
// component that ships to the browser.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/database";
import { isAdminHost } from "./host";
import { allowRequest } from "@/lib/security/rate-limit";

export async function requireAdminMutation(request: Request): Promise<AdminActor> {
  // Next can normalise request.url to the internal server hostname. Match the
  // browser's Host to the configured allowlist before comparing its Origin.
  const host = (request.headers.get("host") ?? new URL(request.url).host).toLowerCase();
  const origin = request.headers.get("origin");
  const validOrigin = origin === `https://${host}` || (process.env.NODE_ENV !== "production" && origin === `http://${host}`);
  if (!isAdminHost(host) || !validOrigin) throw new AdminAuthError(403, "Invalid admin origin");
  if (Number(request.headers.get("content-length") ?? 0) > 20000) throw new AdminAuthError(413, "Request too large");
  const actor = await requireAdmin("api");
  if (!await allowRequest(actor.id, "admin-mutation", 60)) throw new AdminAuthError(429, "Too many changes. Please try again shortly.");
  return actor;
}

export interface AdminActor {
  id: string;
  email: string;
}

/**
 * Gate a server component or route handler on an authenticated admin. Returns
 * the actor, or redirects unauthenticated callers to the portal login. A signed
 * -in non-admin is redirected too — the portal reveals nothing to them.
 *
 * `mode: "api"` throws instead of redirecting, so API routes return JSON 401/403.
 */
export async function requireAdmin(mode: "page" | "api" = "page"): Promise<AdminActor> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (mode === "api") throw new AdminAuthError(401, "Not authenticated");
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    if (mode === "api") throw new AdminAuthError(403, "Not authorised");
    redirect("/login?denied=1");
  }
  return { id: user.id, email: user.email ?? "" };
}

export class AdminAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** Append an entry to the service-only admin audit log. Best-effort: a logging
 * failure never blocks the underlying action, but it is surfaced in server logs. */
export async function logAdminAction(
  actor: AdminActor,
  action: string,
  target: { type?: string; id?: string; detail?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const { error } = await createAdminClient().from("admin_audit_log").insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      target_type: target.type ?? null,
      target_id: target.id ?? null,
      detail: (target.detail ?? null) as Json,
    });
    if (error) throw error;
  } catch (error) {
    console.error("admin_audit_log insert failed", { action, error });
  }
}
