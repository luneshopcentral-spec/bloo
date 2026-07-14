import { describe, expect, it } from "vitest";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import {
  CASE_EDITORIAL_RECORDS,
  getPaidReleaseReadiness,
} from "./editorial";

describe("clinical editorial governance", () => {
  it("has a versioned, sourced record for every simulator case", () => {
    expect(CASE_EDITORIAL_RECORDS.map((record) => record.caseId).sort()).toEqual(
      STATIC_CASES.map((caseData) => caseData.id).sort()
    );
    expect(CASE_EDITORIAL_RECORDS.every((record) => (
      record.version.length > 0 &&
      record.contentUpdatedAt.length > 0 &&
      record.nextReviewDue.length > 0 &&
      record.references.length >= 2
    ))).toBe(true);
  });

  it("blocks paid release until pharmacist and jurisdiction reviews are recorded", () => {
    const readiness = getPaidReleaseReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toHaveLength(STATIC_CASES.length * 2);
  });
});
