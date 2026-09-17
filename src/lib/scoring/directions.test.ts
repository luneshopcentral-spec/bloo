import { describe, expect, it } from "vitest";
import { directionsMatch } from "./directions";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { expandAbbrevs } from "./abbreviations";

describe("prescription direction safety", () => {
  it("accepts each authored direction and its expanded abbreviations", () => {
    for (const c of STATIC_CASES) for (const item of c.items) {
      expect(directionsMatch(item.directions, item.directions)).toBe(true);
      expect(directionsMatch(item.directions, expandAbbrevs(item.directions))).toBe(true);
    }
  });
  it.each([
    "Take ONE capsule two times daily",
    "Take ONE capsule three times daily plus one at bedtime",
    "Take TWO capsules three times daily",
    "Take capsule three times daily",
    "Do not take one capsule three times daily",
    "Take ONE capsule three times daily as needed",
  ])("rejects changed or added instructions: %s", (actual) => {
    expect(directionsMatch("Take ONE capsule tds", actual)).toBe(false);
  });
  it("accepts equivalent reviewed spelling and frequency aliases", () => {
    expect(directionsMatch("Take ONE tab bd pc", "Take 1 tablet twice a day after meals.")).toBe(true);
    expect(directionsMatch("Give 10mL tds for 10 days", "Give 10 millilitres three times daily for ten days")).toBe(true);
  });
  it("does not discard decimal points in doses", () => {
    expect(directionsMatch("Give 1.5mL daily", "Give 15mL daily")).toBe(false);
  });
});
