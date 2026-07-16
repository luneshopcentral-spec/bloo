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
      expect(practiceCase.items.length, practiceCase.title).toBeGreaterThan(0);
      if (!practiceCase.patientLookup.requiresNewPatient) {
        expect(
          patientIds.has(practiceCase.patientLookup.existingPatientSeedId ?? ""),
          practiceCase.title
        ).toBe(true);
      }
      for (const item of practiceCase.items) {
        expect(drugIds.has(item.correctDrugSeedId), `${practiceCase.title}: ${item.drug}`).toBe(true);
        for (const warning of item.correctWarnings) {
          expect(warningLabels.has(warning), `${practiceCase.title}: ${warning}`).toBe(true);
        }
      }
    }
  });

  it("keeps every prescribed item on a script a distinct medicine", () => {
    for (const practiceCase of STATIC_CASES) {
      const seedIds = practiceCase.items.map((item) => item.correctDrugSeedId);
      expect(new Set(seedIds).size, practiceCase.title).toBe(seedIds.length);
    }
  });

  it("uses unique authority numbers", () => {
    const authorityCases = STATIC_CASES.filter((practiceCase) => practiceCase.authority?.required);
    const numbers = authorityCases.map((practiceCase) => practiceCase.authority?.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("only requires a written approval number where the script carries an S8 item", () => {
    // A streamlined code is a PBS restriction and applies to S4 medicines too,
    // so only the approval-number cases are expected to be controlled drugs.
    const approvalCases = STATIC_CASES.filter(
      (practiceCase) => practiceCase.authority?.required && practiceCase.authority.type === "approval"
    );
    expect(approvalCases.length).toBeGreaterThan(0);

    for (const practiceCase of approvalCases) {
      const schedules = practiceCase.items.map(
        (item) => DRUG_LIBRARY.find((candidate) => candidate.seed_id === item.correctDrugSeedId)?.schedule
      );
      expect(schedules, practiceCase.title).toContain("S8");
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
