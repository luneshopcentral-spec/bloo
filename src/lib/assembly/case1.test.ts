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
      mainLabelFace: "back",
      warningLabels: [],
    });

    expect(result.passed).toBe(true);
    expect(result.pointsEarned).toBe(2);
    expect(result.criticalFailures).toEqual([]);
  });

  it("blocks the attempt for a lookalike pack or unsafe label face", () => {
    const result = addCase1AssemblyChecks(BASE_RESULT, {
      packId: "erythromycin-mayne-500-tab-20",
      mainLabelFace: "top",
      warningLabels: [],
    });

    expect(result.passed).toBe(false);
    expect(result.criticalFailures).toEqual(["assembly_pack", "label_placement"]);
  });
});
