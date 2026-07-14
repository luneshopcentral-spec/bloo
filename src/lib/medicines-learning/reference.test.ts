import { describe, expect, it } from "vitest";
import { ALL_WARNINGS, STATIC_CASES } from "@/lib/cases/static-cases";
import {
  MEDICINE_LEARNING_PROFILES,
  PUBLIC_MEDICINE_REFERENCES,
  findBestMedicineLearningProfile,
  normalizeMedicineQuery,
  searchMedicineLearningProfiles,
} from "./reference";
import { normalizeWarningLabel, resolveWarningLabelInput } from "@/lib/warnings/resolve";

describe("medicines learning reference", () => {
  it("has a searchable profile for every current simulator medicine", () => {
    for (const practiceCase of STATIC_CASES) {
      const profile = findBestMedicineLearningProfile(practiceCase.drug);
      expect(profile, practiceCase.title).not.toBeNull();
      expect(normalizeMedicineQuery(practiceCase.drug)).toContain(
        normalizeMedicineQuery(profile?.genericName ?? "missing")
      );
    }
  });

  it("handles spelling variants and class searches", () => {
    expect(findBestMedicineLearningProfile("AMOXYCILLIN SUSPENSION")?.id).toBe("amoxicillin");
    expect(searchMedicineLearningProfiles("benzodiazepine")[0]?.id).toBe("temazepam");
    expect(searchMedicineLearningProfiles("antibiotic").length).toBeGreaterThan(1);
  });

  it("keeps every profile behind educator review until signed off", () => {
    expect(MEDICINE_LEARNING_PROFILES.every(
      (profile) => profile.reviewStatus === "educator_review_required"
    )).toBe(true);
    expect(PUBLIC_MEDICINE_REFERENCES.map((source) => source.id)).toEqual(
      expect.arrayContaining(["tga-cmi", "tga-pi", "healthdirect", "pbs"])
    );
  });

  it("does not print the case warning-label answer phrases in the study clues", () => {
    for (const practiceCase of STATIC_CASES) {
      const profile = findBestMedicineLearningProfile(practiceCase.drug);
      expect(profile).not.toBeNull();
      const studyText = normalizeWarningLabel([
        profile?.summary,
        ...(profile?.sections.map((section) => section.detail) ?? []),
        ...(profile?.labelReasoningClues ?? []),
      ].join(" "));

      for (const correctWarning of practiceCase.correctWarnings) {
        expect(studyText, `${practiceCase.id} leaked ${correctWarning}`).not.toContain(
          normalizeWarningLabel(correctWarning)
        );
      }
    }
  });
});

describe("written warning labels", () => {
  it("accepts standard wording, common equivalents and training codes", () => {
    expect(resolveWarningLabelInput(ALL_WARNINGS, "Shake well before use")?.text)
      .toBe("Shake well before use");
    expect(resolveWarningLabelInput(ALL_WARNINGS, "stay upright for 30 minutes")?.text)
      .toBe("Do not lie down for 30 min after taking");
    expect(resolveWarningLabelInput(ALL_WARNINGS, "L18")?.text)
      .toBe("Take with food or milk");
  });

  it("does not guess an unknown label", () => {
    expect(resolveWarningLabelInput(ALL_WARNINGS, "take whenever you remember"))
      .toBeNull();
  });
});
