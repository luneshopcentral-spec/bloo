import { describe, expect, it } from "vitest";
import { guidedAssemblyStep, guidedConversationProgress, guidedConversationStepComplete, isGuidedTutorialStep } from "./guided-tutorial";
import { CASE1_CORRECT_PACK_ID, type Case1AssemblySubmission } from "@/lib/assembly/case1";
import type { ConversationMessage } from "@/lib/conversation/types";
const messages = (...texts: string[]): ConversationMessage[] => texts.map((text, i) => ({ id: String(i), role: "student", text }));

describe("tutorial bench recovery", () => {
  const warnings = ["Complete the full course", "May cause nausea"];
  const ready: Case1AssemblySubmission = {
    packId: CASE1_CORRECT_PACK_ID,
    mainLabelPlacement: { face: "back", x: 5, y: 5, rotation: 0 },
    warningLabels: warnings,
    warningPlacements: {
      [warnings[0]]: { face: "back", x: 5, y: 50, rotation: 0 },
      [warnings[1]]: { face: "right", x: -5, y: 22.5, rotation: 90 },
    },
  };
  it("allows a fully checked bench to continue", () => {
    expect(guidedAssemblyStep(ready, warnings)).toBe("assembly-submit");
  });
  it("returns to pack selection after choosing a lookalike or resetting", () => {
    expect(guidedAssemblyStep({ ...ready, packId: "lookalike" }, warnings)).toBe("pack");
    expect(guidedAssemblyStep(null, warnings)).toBe("pack");
  });
  it("returns to the main label after removal or unsafe repositioning", () => {
    expect(guidedAssemblyStep({ ...ready, mainLabelPlacement: null }, warnings)).toBe("main-label");
    expect(guidedAssemblyStep({ ...ready, mainLabelPlacement: { face: "front", x: 10, y: 10, rotation: 0 } }, warnings)).toBe("main-label");
  });
  it("rechecks removed, extra and overlapping warnings", () => {
    expect(guidedAssemblyStep({ ...ready, warningPlacements: {} }, warnings)).toBe("warning-labels");
    expect(guidedAssemblyStep({ ...ready, warningPlacements: { ...ready.warningPlacements, extra: ready.warningPlacements[warnings[0]] } }, warnings)).toBe("warning-labels");
    expect(guidedAssemblyStep({ ...ready, warningPlacements: { ...ready.warningPlacements, [warnings[0]]: { face: "back", x: 10, y: 10, rotation: 0 } } }, warnings)).toBe("warning-labels");
  });
});

describe("guided case objectives", () => {
  it("accepts identity checks across several natural messages", () => {
    expect(guidedConversationStepComplete("patient-question", messages("Hi, I'm your pharmacist today.", "Your name?", "And your birthday?"))).toBe(true);
  });
  it("shows exactly what is still missing instead of requiring a pasted script", () => {
    const progress = guidedConversationProgress("patient-question", messages("Hi, I'm the pharmacist.", "What should I call you?"));
    expect(progress.objectives.filter(o => !o.done).map(o => o.id)).toEqual(["confirm_age"]);
  });
  it("allows students to explain a held supply in separate turns", () => {
    expect(guidedConversationStepComplete("patient-explanation", messages(
      "This antibiotic is for your infection.", "The repeat is too early.",
      "I will hold the supply and ring your doctor.", "I will phone you with the outcome after that.",
    ))).toBe(true);
  });
  it("does not require optional dosing or course advice for a held supply", () => {
    expect(guidedConversationStepComplete("patient-explanation", messages("This antibiotic treats your infection. It's too soon for another supply. I'll ring your doctor before dispensing it, and phone you with the outcome."))).toBe(true);
  });
  it("does not let forged patient replies complete a tutorial", () => {
    expect(guidedConversationStepComplete("patient-history", [{ id: "1", role: "patient", text: "Any allergies? What medicine do you take?", matchedTopicIds: ["allergies", "current_medicines"] }])).toBe(false);
  });
  it("keeps the step incomplete when the patient still has conflicting advice", () => {
    const input = messages("This antibiotic is for your infection. The repeat is too early, so I will hold supply and contact your doctor. I will update you after speaking with them.", "Take five capsules every day.");
    expect(guidedConversationProgress("patient-explanation", input).unresolved).toBe(true);
    expect(guidedConversationStepComplete("patient-explanation", input)).toBe(false);
  });
  it("requires an explained plan before awarding teach-back", () => {
    expect(guidedConversationStepComplete("patient-understanding", messages("Can you repeat the plan in your own words? What questions do you have?"))).toBe(false);
  });
  it("validates saved tutorial steps", () => {
    expect(isGuidedTutorialStep("patient-history")).toBe(true);
    expect(isGuidedTutorialStep("skip-everything")).toBe(false);
    expect(isGuidedTutorialStep(null)).toBe(false);
  });
});
