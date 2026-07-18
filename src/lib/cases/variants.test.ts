import { describe, expect, it } from "vitest";
import { PRESCRIBER_LIBRARY } from "../../../supabase/seeds/prescriber-library";
import { STATIC_CASES } from "./static-cases";
import { applyCaseVariant } from "./variants";

const NOW = new Date("2026-07-17T10:00:00");
const case1 = STATIC_CASES[0];
const case7 = STATIC_CASES.find((c) => c.authority?.type === "approval")!;
const case9 = STATIC_CASES.find((c) => c.expectedPrescriberNo)!;
const case13 = STATIC_CASES.find((c) => c.authority?.type === "streamlined")!;

describe("per-attempt case variants", () => {
  it("is deterministic in the seed and never mutates the authored case", () => {
    const before = JSON.stringify(case1);
    const a = applyCaseVariant(case1, 12345, NOW);
    const b = applyCaseVariant(case1, 12345, NOW);
    const c = applyCaseVariant(case1, 99999, NOW);

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(case1)).toBe(before);
    // Different seeds vary at least the script date across a 42-day window.
    expect([a.date, c.date].every((d) => /^\d{2}\/\d{2}\/\d{2}$/.test(d))).toBe(true);
  });

  it("keeps every clinical field identical to the authored case", () => {
    const variant = applyCaseVariant(case1, 4242, NOW);
    expect(variant.items).toEqual(case1.items);
    expect(variant.expectedDecision).toBe(case1.expectedDecision);
    expect(variant.errors).toEqual(case1.errors);
    expect(variant.patientLookup).toEqual(case1.patientLookup);
  });

  it("issues a fresh script date within the recent window", () => {
    for (const seed of [1, 2, 3, 500, 87654]) {
      const variant = applyCaseVariant(case1, seed, NOW);
      const [dd, mm, yy] = variant.date.split("/").map(Number);
      const date = new Date(2000 + yy, mm - 1, dd);
      const daysAgo = (NOW.getTime() - date.getTime()) / 86_400_000;
      expect(daysAgo).toBeGreaterThan(0);
      expect(daysAgo).toBeLessThanOrEqual(43);
    }
  });

  it("rotates the prescriber through the authored pool only", () => {
    const numbers = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const variant = applyCaseVariant(case1, seed, NOW);
      numbers.add(variant.prescriberNo);
      const prescriber = PRESCRIBER_LIBRARY.find(
        (entry) => entry.prescriber_number === variant.prescriberNo
      )!;
      expect(case1.prescriberPool).toContain(prescriber.seed_id);
      expect(variant.doctor).toBe(`${prescriber.surname}, ${prescriber.firstname}`);
    }
    // Across 40 attempts the pool must actually rotate.
    expect(numbers.size).toBeGreaterThan(1);
  });

  it("varies approval numbers but never streamlined codes", () => {
    const approvals = new Set<string>();
    for (let seed = 0; seed < 10; seed += 1) {
      const variant = applyCaseVariant(case7, seed, NOW);
      expect(variant.authority?.number).toMatch(/^H\d{4}[A-Z]{2}$/);
      approvals.add(variant.authority!.number);
      expect(variant.authority?.indication).toBe(case7.authority?.indication);
    }
    expect(approvals.size).toBeGreaterThan(1);

    const streamlined = applyCaseVariant(case13, 777, NOW);
    expect(streamlined.authority?.number).toBe(case13.authority?.number);
  });

  it("leaves the prescriber-mismatch teaching case untouched", () => {
    const variant = applyCaseVariant(case9, 31337, NOW);
    expect(variant.doctor).toBe(case9.doctor);
    expect(variant.prescriberNo).toBe(case9.prescriberNo);
    expect(variant.expectedPrescriberNo).toBe(case9.expectedPrescriberNo);
  });

  it("only pools prescribers that exist in the bundled directory", () => {
    const known = new Set(PRESCRIBER_LIBRARY.map((entry) => entry.seed_id));
    for (const practiceCase of STATIC_CASES) {
      for (const seedId of practiceCase.prescriberPool ?? []) {
        expect(known.has(seedId), `${practiceCase.id}: ${seedId}`).toBe(true);
      }
    }
  });
});
