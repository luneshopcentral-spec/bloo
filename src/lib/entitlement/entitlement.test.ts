import { describe, expect, it } from "vitest";
import { canPlayCase, isDeveloper, isFreeCase } from "./entitlement";

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
});
