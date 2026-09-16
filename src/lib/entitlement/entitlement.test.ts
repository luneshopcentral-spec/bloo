import { describe, expect, it } from "vitest";
import { canPlayCase, hasCompAccess, isDeveloper, isFreeCase } from "./entitlement";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

const freeCase = { isFree: true };
const paidCase = { isFree: false };
const unmarkedCase = {}; // isFree omitted → treated as paid

describe("entitlement", () => {
  it("treats only isFree === true as a free case", () => {
    expect(isFreeCase(freeCase)).toBe(true);
    expect(isFreeCase(paidCase)).toBe(false);
    expect(isFreeCase(unmarkedCase)).toBe(false);
  });

  it("recognises developers only by role 'admin'", () => {
    expect(isDeveloper({ has_paid: false, role: "admin" })).toBe(true);
    expect(isDeveloper({ has_paid: false, role: "student" })).toBe(false);
    expect(isDeveloper({ has_paid: false, role: null })).toBe(false);
    expect(isDeveloper(null)).toBe(false);
  });

  it("lets anyone play a free case, even with no profile", () => {
    expect(canPlayCase(freeCase, null)).toBe(true);
    expect(canPlayCase(freeCase, { has_paid: false, role: "student" })).toBe(true);
  });

  it("blocks paid cases for unpaid, non-developer users", () => {
    expect(canPlayCase(paidCase, null)).toBe(false);
    expect(canPlayCase(paidCase, { has_paid: false, role: "student" })).toBe(false);
    expect(canPlayCase(unmarkedCase, { has_paid: false, role: null })).toBe(false);
  });

  it("unlocks paid cases for paid users and developers", () => {
    expect(canPlayCase(paidCase, { has_paid: true, role: "student" })).toBe(true);
    expect(canPlayCase(paidCase, { has_paid: false, role: "admin" })).toBe(true);
  });

  it("treats a live comp/trial window as access, and an expired one as none", () => {
    expect(hasCompAccess({ has_paid: false, role: null, comp_access_until: future })).toBe(true);
    expect(hasCompAccess({ has_paid: false, role: null, comp_access_until: past })).toBe(false);
    expect(hasCompAccess({ has_paid: false, role: null, comp_access_until: null })).toBe(false);
    expect(hasCompAccess({ has_paid: false, role: null })).toBe(false);
    expect(hasCompAccess(null)).toBe(false);
  });

  it("unlocks paid cases during a live trial grant but not after it lapses", () => {
    expect(canPlayCase(paidCase, { has_paid: false, role: "student", comp_access_until: future })).toBe(true);
    expect(canPlayCase(paidCase, { has_paid: false, role: "student", comp_access_until: past })).toBe(false);
  });
});
