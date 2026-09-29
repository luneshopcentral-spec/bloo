import { describe, expect, it } from "vitest";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import type { DispenseResult } from "@/lib/scoring/types";
import { DRUG_LIBRARY } from "../../../supabase/seeds/drug-library";
import { addAssemblyChecks, correctPackIdFor, packOptionsFor } from "./all-cases";
import type { Case1AssemblySubmission } from "./case1";
import { allPacks } from "./packs";

const BASE: DispenseResult = {
  checks: [], pointsEarned: 0, pointsTotal: 0, passThreshold: 0,
  passed: true, criticalFailures: [], assisted: false,
  countsTowardProgress: true, tip: "Check the pack.",
};

function assembled(caseId: string, itemIndex: number, warnings: string[]): Case1AssemblySubmission {
  const c = STATIC_CASES.find((item) => item.id === caseId)!;
  return {
    packId: correctPackIdFor(c, itemIndex),
    mainLabelPlacement: { face: "back", x: 5, y: 5, rotation: 0 },
    warningLabels: warnings,
    warningPlacements: Object.fromEntries(warnings.map((warning, index) => [warning, index === 0
      ? { face: "right", x: -5, y: 22.5, rotation: 90 }
      : { face: "back", x: 5, y: 50, rotation: 0 }])),
  };
}

describe("pack assembly across the case library", () => {
  it("offers the exact product and at least one distractor for every prescribed medicine", () => {
    for (const c of STATIC_CASES) for (const [index] of c.items.entries()) {
      const options = packOptionsFor(c, index);
      expect(options.length, `${c.id} item ${index + 1}`).toBeGreaterThan(1);
      expect(options.filter((option) => option.id === correctPackIdFor(c, index)), `${c.id} item ${index + 1}`).toHaveLength(1);
    }
  });

  it("checks each medicine separately on a two-item prescription", () => {
    const c = STATIC_CASES.find((item) => item.id === "case-13")!;
    const warnings = c.items.map((item) => item.correctWarnings);
    const complete = { items: c.items.map((_, index) => assembled(c.id, index, warnings[index])) };
    const passed = addAssemblyChecks(BASE, c, complete, warnings);
    expect(passed.checks.filter((check) => check.category === "assembly_pack" && check.passed)).toHaveLength(2);
    expect(passed.checks.filter((check) => check.category === "label_placement" && check.passed)).toHaveLength(2);

    const missingSecond = addAssemblyChecks(BASE, c, { items: [complete.items[0]] }, warnings);
    expect(missingSecond.criticalFailures).toEqual(["assembly_pack", "label_placement"]);
    expect(missingSecond.checks.find((check) => check.label === "Item 2: Physical medicine pack")?.passed).toBe(false);
  });

  it("requires every warning chosen in the dispensing form to be placed on the pack", () => {
    const c = STATIC_CASES[1];
    const selected = c.items[0].correctWarnings;
    const omitted = assembled(c.id, 0, selected.slice(0, -1));
    const result = addAssemblyChecks(BASE, c, { items: [omitted] }, [selected]);
    expect(result.checks.find((check) => check.category === "label_placement")?.detail).toContain("Selected warning labels are missing");
    expect(result.criticalFailures).toContain("label_placement");
  });

  it("builds the shelf from the product the student dispensed, not the case answer", () => {
    const case1 = STATIC_CASES.find((item) => item.id === "case-1")!;
    const case2 = STATIC_CASES.find((item) => item.id === "case-2")!;
    const wrongProduct = DRUG_LIBRARY.find((drug) => drug.generic_name === "AMOXYCILLIN" && drug.form === "CAP")!;
    const shelf = packOptionsFor(case1, 0, wrongProduct);
    expect(shelf.map((pack) => pack.id)).toContain(wrongProduct.seed_id);
    expect(shelf.length).toBeGreaterThan(1);
    // The same dispensed product gives the same shelf in any case: it carries no hint of the answer.
    expect(packOptionsFor(case2, 0, wrongProduct)).toEqual(shelf);
    // Taking the carton that matches the wrong product still fails the pack check.
    const wrongPack = { ...assembled(case1.id, 0, []), packId: wrongProduct.seed_id };
    expect(addAssemblyChecks(BASE, case1, wrongPack).criticalFailures).toContain("assembly_pack");
  });

  it("prints every carton in plain words, not directory codes", () => {
    for (const pack of allPacks()) {
      expect(pack.form, pack.id).not.toMatch(/^(?:CAP|TAB|SUSP|PATCH|MR TAB|ER TAB|SR TAB)$/);
      expect(pack.strength, pack.id).not.toMatch(/\d(?:MG|MCG|ML)/);
      expect(pack.generic, pack.id).not.toMatch(/^[A-Z]{4,}$/);
    }
    expect(allPacks().find((pack) => pack.id === "erythromycin-mayne-cap-250")).toMatchObject({
      brand: "Mayne Pharma", generic: "Erythromycin", strength: "250 mg", form: "Capsules", packSize: "25 capsules",
    });
  });

  it("still grades a Case 1 pack saved under its original id", () => {
    const case1 = STATIC_CASES.find((item) => item.id === "case-1")!;
    const legacy = { ...assembled(case1.id, 0, []), packId: "erythromycin-mayne-250-cap-25" };
    expect(addAssemblyChecks(BASE, case1, legacy).criticalFailures).not.toContain("assembly_pack");
  });

  it("does not accept an unselected sticker smuggled into the pack submission", () => {
    const c = STATIC_CASES[1];
    const selected = c.items[0].correctWarnings.slice(0, 1);
    const submission = assembled(c.id, 0, c.items[0].correctWarnings);
    const result = addAssemblyChecks(BASE, c, { items: [submission] }, [selected]);
    expect(result.criticalFailures).toContain("label_placement");
  });
});
