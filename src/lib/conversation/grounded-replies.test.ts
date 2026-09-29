import { describe, expect, it } from "vitest";
import { CONVERSATION_CASES, getConversationCase } from "./cases";
import { advanceConversation, createDialogueState, type DialogueState } from "./engine";
import { groundedLine } from "./grounding";
import { classifyWithRules } from "./matcher";

function talk(caseId: string, lines: string[]) {
  const c = getConversationCase(caseId);
  let state: DialogueState = createDialogueState();
  return lines.map((text) => {
    const turn = advanceConversation(c, state, text);
    state = turn.state;
    return turn.reply.text;
  });
}

function reply(caseId: string, topicId: string, words: string[]): string | null {
  const topic = getConversationCase(caseId).topics.find((t) => t.id === topicId)!;
  return groundedLine(topic.grounded!, words, false);
}

/** What the patient says back; "" when only a neutral acknowledgement applies. */
function said(caseId: string, topicId: string, words: string[]): string {
  return reply(caseId, topicId, words) ?? "";
}

describe("grounded replies", () => {
  const grounded = Object.values(CONVERSATION_CASES).flatMap((c) =>
    c.topics.filter((t) => t.grounded).map((t) => [c.caseId, t.id] as const));

  it("covers the counselling topics whose authored replies overstated what was said", () => {
    expect(grounded.length).toBeGreaterThanOrEqual(23);
  });

  it.each(grounded)("%s %s: every authored example is heard back as at least one point", (caseId, topicId) => {
    const c = getConversationCase(caseId);
    const topic = c.topics.find((t) => t.id === topicId)!;
    for (const example of topic.examples) {
      if (!classifyWithRules({ ...c, topics: [topic] }, example).length) continue;
      expect(groundedLine(topic.grounded!, [example], true), example).not.toBeNull();
    }
  });

  it("never repeats a point the student did not make", () => {
    // The reported transcript: nausea only — never "empty stomach".
    expect(reply("case-1", "nausea_advice", ["You may experience nausea."])).toBe("It might make me feel a bit sick.");
    expect(reply("case-3", "storage", ["Don't put it in the fridge."])).toBeNull();
    expect(reply("case-3", "storage", ["Store it in the fridge, don't freeze it."])).toBe("I'll keep it in the fridge and I won't freeze it.");
    expect(said("case-3", "liquid_handling", ["Use a teaspoon to measure it."])).not.toMatch(/won't use a kitchen spoon/);
    expect(said("case-6", "water_upright", ["Take it with a glass of water and stay upright."])).not.toMatch(/30 minutes|full glass/);
    expect(said("case-7", "sedation_safety", ["You can have a drink with it."])).not.toMatch(/avoid alcohol/);
    expect(said("case-8", "explain_risk", ["It can slow down your breathing."])).not.toMatch(/opioids/);
    expect(reply("case-10", "red_flags", ["Watch for mouth ulcers."])).toBe("I need to watch out for mouth ulcers.");
    expect(said("case-12", "bleeding_interaction", ["Naproxen with Eliquis increases your bleeding risk."])).not.toMatch(/black stools|headache/);
    expect(said("case-13", "hypo_advice", ["Your blood sugar could drop, so watch for feeling shaky."])).not.toMatch(/sugary/);
  });

  it("repeats every point the student did make", () => {
    expect(reply("case-1", "nausea_advice", ["It can cause some nausea. Take it on an empty stomach, and let us know if it's troublesome."]))
      .toBe("It might make me feel a bit sick, I should take it on an empty stomach and I'll let you know if it's a problem.");
    expect(reply("case-2", "bleeding_safety", ["Get urgent help for black stools or bleeding that won't stop."]))
      .toBe("I'll get urgent help if I have serious or unusual bleeding or black stools.");
    expect(reply("case-6", "separation", ["Separate your antacid by at least 2 hours."]))
      .toBe("I'll keep my antacid apart from the doxycycline. I'll leave at least two hours between them.");
  });

  it("does not count a question as advice", () => {
    expect(reply("case-1", "nausea_advice", ["Do you feel sick at all?"])).toBeNull();
  });
});

describe("the reported conversation, after grounding", () => {
  const lines = [
    "hi what is your adress", "what is your DOB", "your medicine is ready", "have you had it before",
    "do you have any allergies", "do you have any medical conditions", "you may experience nasuea",
    "repeat the instructions back to me", "do you have any questions",
  ];

  it("repeats back only the nausea point, then has no hold-based question after being told it's ready", () => {
    const replies = talk("case-1", lines);
    expect(replies[6]).toBe("Okay — it might make me feel a bit sick.");
    expect(replies[7]).toBe("It might make me feel a bit sick.");
    expect(replies[7]).not.toMatch(/empty stomach/);
    expect(replies[8]).toMatch(/covers everything/);
    expect(replies.join(" ")).not.toMatch(/how will I hear back/);
  });
});

describe("the patient's own questions follow what has been said", () => {
  it("asks whether it's ready before any hold is mentioned, and rewords it when asked what they mean", () => {
    const replies = talk("case-1", ["Do you have any questions?", "What do you mean?"]);
    expect(replies[0]).toMatch(/ready for me to take home/i);
    expect(replies[1]).toBe("I mean — can I take my repeat home with me today?");
  });

  it("asks the follow-up question only after the hold, and explains it when asked", () => {
    const replies = talk("case-1", [
      "It's too early for this repeat, so I need to hold it and call your doctor first.",
      "Do you have any questions?",
      "What do you mean by that?",
    ]);
    expect(replies[1]).toBe("What happens next, and how will I hear back?");
    expect(replies[2]).toMatch(/^I mean — what happens with my repeat now/);
  });

  it("rewords any other patient question generically", () => {
    const replies = talk("case-4", ["It's unsafe with the alcohol, so I'm holding this until I've spoken to your doctor.", "Any questions?", "What do you mean?"]);
    expect(replies[1]).toBe("How long will it take to speak with my doctor?");
    expect(replies[2]).toBe("I just mean — how long will it take to speak with my doctor?");
  });

  it("notices when the student says it's ready and then that it's on hold", () => {
    const replies = talk("case-1", ["Your antibiotics are ready.", "Actually, it's on hold."]);
    expect(replies[1]).toBe("Oh — I thought you said it was ready. Is something wrong with it?");
  });

  it("keeps a hold case's question when it does not depend on the hold", () => {
    const replies = talk("case-12", ["Your Eliquis is ready.", "Do you have any questions?"]);
    expect(replies[1]).toMatch(/naproxen/i);
  });
});
