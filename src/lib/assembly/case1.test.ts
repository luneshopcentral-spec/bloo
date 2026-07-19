import { describe, expect, it } from "vitest";
import {
  addCase1AssemblyChecks,
  CASE1_CORRECT_PACK_ID,
} from "./case1";
import type { DispenseResult } from "@/lib/scoring/types";

const BASE_RESULT: DispenseResult = {
  checks: [],
  pointsEarned: 0,
  pointsTotal: 0,
  passed: true,
  passThreshold: 0,
  criticalFailures: [],
  assisted: false,
  countsTowardProgress: true,
  tip: "Review the pack.",
};

describe("Case 1 pack assembly scoring", () => {
  it("accepts the exact pack with the main label on a clear panel", () => {
    const result = addCase1AssemblyChecks(BASE_RESULT, {
      packId: CASE1_CORRECT_PACK_ID,
      mainLabelPlacement: { face: "back", x: 10, y: 10, rotation: 0 },
      warningLabels: [],
      warningPlacements: {},
    });

    expect(result.passed).toBe(true);
    expect(result.pointsEarned).toBe(2);
    expect(result.criticalFailures).toEqual([]);
  });

  it("blocks the attempt for a lookalike pack or unsafe label face", () => {
    const result = addCase1AssemblyChecks(BASE_RESULT, {
      packId: "erythromycin-mayne-500-tab-20",
      mainLabelPlacement: { face: "top", x: 10, y: 10, rotation: 0 },
      warningLabels: [],
      warningPlacements: {},
    });

    expect(result.passed).toBe(false);
    expect(result.criticalFailures).toEqual(["assembly_pack", "label_placement"]);
  });

  it("detects a warning sticker placed over protected pack information", () => {
    const result = addCase1AssemblyChecks(BASE_RESULT, {
      packId: CASE1_CORRECT_PACK_ID,
      mainLabelPlacement: { face: "back", x: 10, y: 10, rotation: 0 },
      warningLabels: ["Take with food or milk"],
      warningPlacements: {
        "Take with food or milk": { face: "front", x: 10, y: 12, rotation: 0 },
      },
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.category === "label_placement")?.detail)
      .toContain("medicine name, strength and dose form");
  });

  it("detects labels placed on top of each other", () => {
    const result = addCase1AssemblyChecks(BASE_RESULT, {
      packId: CASE1_CORRECT_PACK_ID,
      mainLabelPlacement: { face: "back", x: 10, y: 10, rotation: 0 },
      warningLabels: ["Take with food or milk"],
      warningPlacements: {
        "Take with food or milk": { face: "back", x: 20, y: 20, rotation: 0 },
      },
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.category === "label_placement")?.detail)
      .toContain("overlaps");
  });
});
