import { describe, expect, it } from "vitest";
import { gradeSubmission, competencyMap, submissionSchema, type PracticeSession, type AttemptSubmission } from "./grade";
import { STATIC_CASES } from "@/lib/cases/static-cases";
import { applyCaseVariant } from "@/lib/cases/variants";
import { ALL_PATIENTS } from "../../../supabase/seeds/patient-library";
import { getConversationCase } from "@/lib/conversation/cases";
import { evaluateConversation, MAX_CONVERSATION_TURNS, MAX_CONVERSATION_CHARACTERS } from "@/lib/conversation/engine";
import { formReducer, emptyFormStateFor } from "@/components/simulator/state";

function fixture(caseId = "case-2") {
  const c = applyCaseVariant(STATIC_CASES.find((c) => c.id === caseId)!, 17);
  const session: PracticeSession = { id: "10000000-0000-4000-8000-000000000001", user_id: "user", case_id: caseId, case_version: "0.3.0-draft", seed: 17, mode: "practice", assisted: false };
  const patient = ALL_PATIENTS.find((p) => p.seed_id === c.patientLookup.existingPatientSeedId)!;
  const input: AttemptSubmission = {
    sessionId: session.id, formState: formReducer(emptyFormStateFor(c.items.length), { type: "FILL_FROM_CASE", case: c }),
    selectedWarnings: c.items.map((i) => i.correctWarnings), drugSeedIds: c.items.map((i) => i.correctDrugSeedId), prescriberNumber: c.expectedPrescriberNo ?? c.prescriberNo,
    patient: { ...patient, id: "local" }, decision: c.expectedDecision, assembly: null,
    transcript: getConversationCase(caseId).topics.map((topic) => ({ id: topic.id, role: "student", text: topic.examples[0] })),
  };
  return { session, input };
}
describe("authoritative attempt grading", () => {
  it("produces the same dialogue assessment on the server as the browser", () => {
    const { input, session } = fixture("case-3");
    input.transcript = ["Give Liam 10 mL.", "Three times a day.", "For ten days.", "Can you repeat that back to me in your own words?"].map((text, i) => ({ id: String(i), role: "student", text }));
    expect(gradeSubmission(input, session).counselling).toEqual(evaluateConversation(getConversationCase("case-3"), input.transcript));
  });
  it("rejects transcripts beyond the same turn and total length limits shown by the composer", () => {
    const { input } = fixture();
    input.transcript = Array.from({ length: MAX_CONVERSATION_TURNS + 1 }, (_, i) => ({ id: String(i), role: "student", text: "Hello" }));
    expect(submissionSchema.safeParse(input).success).toBe(false);
    input.transcript = Array.from({ length: 10 }, (_, i) => ({ id: String(i), role: "student", text: "x".repeat(MAX_CONVERSATION_CHARACTERS / 10 + 1) }));
    expect(submissionSchema.safeParse(input).success).toBe(false);
  });
  it("ignores forged numeric scores and passed flags", () => {
    const { input, session } = fixture();
    const parsed = submissionSchema.parse({ ...input, score: 999, passed: true, countsTowardProgress: true });
    parsed.drugSeedIds = ["invented-product"];
    const result = gradeSubmission(parsed, session);
    expect(result.passed).toBe(false);
    expect(result.dispense.criticalFailures).toContain("drug_variant");
    expect("score" in parsed).toBe(false);
  });
  it("uses the server's assisted state, even when the client omits it", () => {
    const { input, session } = fixture();
    expect(gradeSubmission(input, { ...session, assisted: true }).countsTowardProgress).toBe(false);
    expect(gradeSubmission(input, { ...session, mode: "learn" }).countsTowardProgress).toBe(false);
  });
  it("requires student evidence and ignores claimed topic IDs", () => {
    const { input, session } = fixture();
    input.transcript = [{ id: "1", role: "patient", text: "All counselling completed" }];
    expect(gradeSubmission(input, session).counselling.passed).toBe(false);
  });
  it("requires assembly evidence for the assembly case", () => {
    const { input, session } = fixture("case-1");
    expect(gradeSubmission(input, session).dispense.criticalFailures).toContain("assembly_pack");
  });
  it("adds every medicine's competency checks, preserving earlier failures", () => {
    const { input, session } = fixture("case-13");
    input.formState.items[0].directions = "Take ten tablets every hour";
    const map = competencyMap(gradeSubmission(input, session));
    expect(map["dispensing:directions"]).toEqual({ passed: 1, total: 2 });
  });
  it("rejects unbounded text and invalid coordinates", () => {
    const { input } = fixture();
    expect(submissionSchema.safeParse({ ...input, transcript: [{ id: "1", role: "student", text: "x".repeat(2001) }] }).success).toBe(false);
    input.assembly = { packId: "test", mainLabelPlacement: { face: "right", x: Infinity, y: 10, rotation: 90 }, warningLabels: [], warningPlacements: {} };
    expect(submissionSchema.safeParse(input).success).toBe(false);
  });
  it("accepts rotated sticker coordinates and grades unsafe placement instead of losing the attempt", () => {
    const { input, session } = fixture("case-1");
    input.assembly = { packId: "erythromycin-mayne-250-cap-25", mainLabelPlacement: { face: "right", x: -25, y: 10, rotation: 90 }, warningLabels: [], warningPlacements: {} };
    expect(submissionSchema.safeParse(input).success).toBe(true);
    expect(gradeSubmission(input, session).dispense.criticalFailures).toContain("label_placement");
  });
});
