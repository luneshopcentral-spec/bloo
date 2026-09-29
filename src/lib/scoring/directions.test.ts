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

describe("dispensing shorthand in the directions box", () => {
  it.each([
    ["1c qid", "Take ONE capsule four times a day"],
    ["i cap q.i.d.", "Take ONE capsule four times a day"],
    ["i-ii tabs nocte p.r.n.", "Take ONE to TWO tablets at night when required"],
    ["1 tab b.i.d. pc", "Take ONE tablet twice a day after food"],
    ["1 tab t.d.s. a.c.", "Take ONE tablet three times a day before food"],
    ["10ml t.d.s. x 10/7", "Take 10 mL three times a day for 10 days"],
    ["1 patch q72h", "Apply ONE patch every 72 hours"],
    ["1 tab mane + midi", "Take ONE tablet in the morning and at midday"],
    ["1 tab sl stat", "Take ONE tablet under the tongue immediately"],
    ["2 puffs bd", "Inhale TWO puffs twice a day"],
    ["½ tab o.d.", "Take HALF a tablet once a day"],
    ["mdu", "Take as directed"],
    ["1-2 tabs q4-6h prn max 8/24", "Take ONE to TWO tablets every 4 to 6 hours when required maximum 8 in 24 hours"],
  ])("%s → %s", (shorthand, label) => {
    expect(expandAbbrevs(shorthand)).toBe(label);
  });

  it("keeps the student's own words and capitals", () => {
    expect(expandAbbrevs("Take it with food")).toBe("Take it with food");
    expect(expandAbbrevs("Give 10mL tds for 10 days")).toBe("Give 10 mL three times a day for 10 days");
  });

  it("grades equivalent shorthand alike, and a different instruction as different", () => {
    expect(directionsMatch("Take ONE capsule qid", "1c q.i.d.")).toBe(true);
    expect(directionsMatch("Take 1-2 tabs nocte prn", "i-ii tabs hs p.r.n.")).toBe(true);
    expect(directionsMatch("Take ONE tablet mane and at noon", "1 tab mane + midi")).toBe(true);
    expect(directionsMatch("Take as directed", "mdu")).toBe(true);
    expect(directionsMatch("Take ONE capsule qid", "1c q6h")).toBe(false);
    expect(directionsMatch("Take ONE tablet daily", "1 tab mane")).toBe(false);
    expect(directionsMatch("Take ONE tablet bd", "1 tab bd pc")).toBe(false);
  });
});
