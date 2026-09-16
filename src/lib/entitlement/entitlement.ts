import type { PracticeCase } from "@/lib/types/case";

/**
 * The subset of a profile row that decides what a user may play. Kept minimal so
 * both the browser (practice page) and the attempt-persist path can share one
 * rule. `null` means "no profile loaded" — treat as an unpaid student.
 */
export interface CaseEntitlement {
  has_paid: boolean;
  role: string | null;
  /** ISO timestamp of a live trial/comp grant (from an access code or admin
   * grant). Treated as paid access until it passes; null/past means no grant. */
  comp_access_until?: string | null;
}

/** A trial/comp code grant is live when its expiry is still in the future. */
export function hasCompAccess(entitlement: CaseEntitlement | null): boolean {
  const until = entitlement?.comp_access_until;
  if (!until) return false;
  const ts = Date.parse(until);
  return Number.isFinite(ts) && ts > Date.now();
}

/** Developer/admin accounts get full access in every environment. Set the role
 * by hand in Supabase (`update profiles set role = 'admin' where …`). */
export function isDeveloper(entitlement: CaseEntitlement | null): boolean {
  return entitlement?.role === "admin";
}

export function isFreeCase(caseData: Pick<PracticeCase, "isFree">): boolean {
  return caseData.isFree === true;
}

/**
 * One rule, used everywhere: a case is playable if it is a free demo case, the
 * user has paid, or the user is a developer/admin.
 */
export function canPlayCase(
  caseData: Pick<PracticeCase, "isFree">,
  entitlement: CaseEntitlement | null
): boolean {
  return isFreeCase(caseData)
    || entitlement?.has_paid === true
    || hasCompAccess(entitlement)
    || isDeveloper(entitlement);
}
