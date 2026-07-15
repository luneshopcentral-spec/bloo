import { describe, expect, it } from "vitest";
import { ALL_PATIENTS } from "../../../supabase/seeds/patient-library";
import { DRUG_LIBRARY } from "../../../supabase/seeds/drug-library";
import { ALL_WARNINGS, STATIC_CASES } from "./static-cases";

describe("static case library consistency", () => {
  it("links every case to an available medicine, patient and warning label", () => {
    const drugIds = new Set(DRUG_LIBRARY.map((drug) => drug.seed_id));
    const patientIds = new Set(ALL_PATIENTS.map((patient) => patient.seed_id));
    const warningLabels = new Set(ALL_WARNINGS.map((warning) => warning.text));

    for (const practiceCase of STATIC_CASES) {
      expect(drugIds.has(practiceCase.correctDrugSeedId), practiceCase.title).toBe(true);
      if (!practiceCase.patientLookup.requiresNewPatient) {
        expect(
          patientIds.has(practiceCase.patientLookup.existingPatientSeedId ?? ""),
          practiceCase.title
        ).toBe(true);
      }
      for (const warning of practiceCase.correctWarnings) {
        expect(warningLabels.has(warning), `${practiceCase.title}: ${warning}`).toBe(true);
      }
    }
  });

  it("uses unique authority numbers and only requires them for S8 products", () => {
    const authorityCases = STATIC_CASES.filter((practiceCase) => practiceCase.authority?.required);
    const numbers = authorityCases.map((practiceCase) => practiceCase.authority?.number);
    expect(new Set(numbers).size).toBe(numbers.length);

    for (const practiceCase of authorityCases) {
      const drug = DRUG_LIBRARY.find((candidate) => candidate.seed_id === practiceCase.correctDrugSeedId);
      expect(drug?.schedule, practiceCase.title).toBe("S8");
    }
  });

  it("contains one deliberate printed prescriber-number mismatch", () => {
    const mismatches = STATIC_CASES.filter(
      (practiceCase) => practiceCase.expectedPrescriberNo &&
        practiceCase.expectedPrescriberNo !== practiceCase.prescriberNo
    );
    expect(mismatches.map((practiceCase) => practiceCase.id)).toEqual(["case-9"]);
  });
});
