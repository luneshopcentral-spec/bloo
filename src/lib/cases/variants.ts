// Per-attempt case variation.
//
// Re-practising a case should test skill, not recall. Each attempt derives a
// variant of the authored case with a fresh script date, a fresh authority
// approval number and — where a case authors a prescriber pool — a different
// prescriber to find in the directory. Clinically authored content
// (medicines, directions, quantities, repeats, warnings, the expected
// decision) never changes, so the teaching point of every case is preserved.
//
// Variants are deterministic in the seed: the same seed always produces the
// same variant, so everything rendered for one attempt (paper prescription,
// validation, revealed answers) agrees with itself.

import { PRESCRIBER_LIBRARY } from "../../../supabase/seeds/prescriber-library";
import type { PracticeCase } from "@/lib/types/case";

/** mulberry32 — small deterministic PRNG, plenty for cosmetic variation. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)];
}

/** DD/MM/YY, as printed on the paper prescriptions. */
function formatScriptDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${dd}/${mm}/${yy}`;
}

/** A prescription date within the last six weeks — always currently valid. */
function variantScriptDate(random: () => number, now: Date): string {
  const daysAgo = 1 + Math.floor(random() * 42);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return formatScriptDate(date);
}

/** Approval numbers follow the authored shape: H + 4 digits + 2 letters. */
function variantApprovalNumber(random: () => number): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — avoids 1/0 confusion
  const digits = Array.from({ length: 4 }, () => Math.floor(random() * 10)).join("");
  const suffix = pick(random, letters.split("")) + pick(random, letters.split(""));
  return `H${digits}${suffix}`;
}

/**
 * Derive this attempt's variant of an authored case. Pure and deterministic:
 * the source case is never mutated.
 */
export function applyCaseVariant(
  caseData: PracticeCase,
  seed: number,
  now: Date = new Date()
): PracticeCase {
  const random = createRandom(seed);
  const variant: PracticeCase = {
    ...caseData,
    date: variantScriptDate(random, now),
  };

  // Rotate the prescriber only where the case authors a pool of clinically
  // interchangeable prescribers. Cases where the prescriber is part of the
  // teaching point (authority specialists, the number-mismatch case) have no
  // pool and keep their authored prescriber.
  if (caseData.prescriberPool?.length) {
    const poolSeedId = pick(random, caseData.prescriberPool);
    const prescriber = PRESCRIBER_LIBRARY.find((entry) => entry.seed_id === poolSeedId);
    if (prescriber) {
      variant.doctor = `${prescriber.surname}, ${prescriber.firstname}`;
      variant.prescriberNo = prescriber.prescriber_number;
    }
  }

  // Fresh approval number each attempt so it must be transcribed, not
  // remembered. Streamlined codes are real, indication-specific codes and are
  // never varied.
  if (caseData.authority?.required && caseData.authority.type === "approval") {
    variant.authority = {
      ...caseData.authority,
      number: variantApprovalNumber(random),
    };
  }

  return variant;
}
