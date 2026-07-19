import type { PracticeCase } from "@/lib/types/case";

/**
 * The subset of a profile row that decides what a user may play. Kept minimal so
 * both the browser (practice page) and the attempt-persist path can share one
 * rule. `null` means "no profile loaded" — treat as an unpaid student.
 */
export interface CaseEntitlement {
  has_paid: boolean;
  role: string | null;
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
  return isFreeCase(caseData) || entitlement?.has_paid === true || isDeveloper(entitlement);
}
