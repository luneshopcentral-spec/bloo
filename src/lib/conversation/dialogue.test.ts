import { describe, expect, it } from "vitest";
import { CONVERSATION_CASES, getConversationCase } from "./cases";
import { advanceConversation, createDialogueState, evaluateConversation, replayConversation, type DialogueState } from "./engine";
import { readDialogueActs } from "./dialogue";
import { correctTypos } from "./spelling";
import type { ConversationMessage } from "./types";

function talk(caseId: string, lines: string[], patientStarted = true) {
  const c = getConversationCase(caseId);
  let state: DialogueState = createDialogueState(patientStarted);
  const turns = lines.map((text) => {
    const turn = advanceConversation(c, state, text);
    state = turn.state;
    return turn;
  });
  return { c, turns, state };
}

function asTranscript(lines: string[]): ConversationMessage[] {
  return lines.map((text, i) => ({ id: String(i), role: "student", text }));
}

describe("the reported conversation (case 1, early repeat on hold)", () => {
  const lines = ["Hi My name is Hiranya", "Your Antibitoics are ready", "What is your name and age"];

  it("greets back by name, reacts naturally, and answers both parts", () => {
    const { turns } = talk("case-1", lines);
    expect(turns[0].reply.text).toBe("Hi Hiranya, nice to meet you.");
    expect(turns[0].unrecognised).toBe(false);
    expect(turns[1].reply.text).toMatch(/thank/i);
    expect(turns[1].reply.text).not.toMatch(/confused|conflict|check it against/i);
    expect(turns[2].reply.text).toContain("John Smith");
    expect(turns[2].reply.text).toContain("14 March 1965");
    // Never the contradictory scripted "why can't I collect it?" after being told it's ready.
    expect(turns[2].reply.text).not.toMatch(/why can't i collect/i);
    for (const turn of turns) expect(turn.reply.text).not.toMatch(/understand the instruction/i);
  });

  it("records telling the patient it's ready as a failed critical safety check", () => {
    const result = evaluateConversation(getConversationCase("case-1"), asTranscript(lines));
    expect(result.unsafeAdvice.map((f) => f.id)).toContain("supply_before_clarification");
    expect(result.criticalFailures).toContain("unsafe_advice");
    // Evidence keeps the student's exact words, typo included.
    expect(result.checks.find((c) => c.id === "unsafe_advice")?.evidence).toContain("Your Antibitoics are ready");
  });
});

describe("greetings and introductions", () => {
  it("uses the student's name only when they give one", () => {
    expect(talk("case-2", ["Hello!"]).turns[0].reply.text).toMatch(/^(?:Hi there\.|Hello\.|Hi\.)$/);
    expect(talk("case-2", ["hi im priya"]).turns[0].reply.text).toContain("Priya");
    expect(talk("case-2", ["Hi, I'm the pharmacist on today"]).state.studentName).toBeNull();
    expect(talk("case-2", ["I'm just going to check your record"]).state.studentName).toBeNull();
    expect(talk("case-2", ["I'm afraid there's a problem"]).state.studentName).toBeNull();
  });

  it("answers how-are-you and does not greet twice", () => {
    const { turns } = talk("case-3", ["Hi, how are you?", "Hello again"]);
    expect(turns[0].reply.text).toMatch(/alright/i);
    expect(turns[1].reply.text).toMatch(/again/i);
  });

  it("still scores a role introduction, but never awards marks for a bare greeting", () => {
    const withRole = talk("case-1", ["Hi, I'm Hiranya, the pharmacist looking after you today"]);
    expect(withRole.turns[0].matchedTopicIds).toContain("introduction");
    expect(withRole.turns[0].reply.text).toBe("Hi Hiranya, nice to meet you.");
    const bare = talk("case-1", ["Hi My name is Hiranya"]);
    expect(bare.turns[0].matchedTopicIds).toEqual([]);
  });

  it.each(Object.keys(CONVERSATION_CASES))("responds naturally to a greeting in %s", (id) => {
    const { turns } = talk(id, ["Hi, my name is Alex."]);
    expect(turns[0].unrecognised).toBe(false);
    expect(turns[0].reply.text).toContain("Alex");
    expect(turns[0].state.unsafeAdvice).toEqual([]);
  });
});

describe("spelling tolerance", () => {
  it.each([
    ["Your Antibitoics are ready", "antibiotics"],
    ["Any alergy to medcines?", "allergy"],
    ["I have your perscription here", "prescription"],
    ["Take one capsle four times a day", "capsule"],
  ])("corrects %s", (input, word) => {
    expect(correctTypos(input).toLowerCase()).toContain(word);
  });

  it.each([
    "Watch for slow or shallow breathing.",
    "This is an injection, not a tablet.",
    "No worries at all.",
    "That matches your record.",
    "I looked at your history.",
    "Take 250 mg erythromycin, 10 mL, qid.",
    "Your doxycycline and amoxicillin.",
    "Hiranya and Mitchell",
  ])("leaves real words, medicine names and doses alone: %s", (input) => {
    expect(correctTypos(input)).toBe(input);
  });

  it("understands a misspelt history question", () => {
    expect(talk("case-2", ["Any alergy to medcines?"]).turns[0].matchedTopicIds).toContain("allergies");
  });
});

describe("telling the patient the medicine is ready", () => {
  it.each([
    "Your antibiotics are ready.",
    "It's ready for you.",
    "Here you go, here's your medicine.",
    "Yes, they're ready.",
    "You can collect your repeat now.",
  ])("is an unsafe supply promise in a hold case: %s", (text) => {
    const { turns } = talk("case-1", [text]);
    expect(turns[0].state.unsafeAdvice.map((f) => f.id)).toContain("supply_before_clarification");
    expect(turns[0].reply.text).not.toMatch(/confused|conflict/i);
  });

  it.each([
    "Your antibiotics aren't ready yet.",
    "Is it ready?",
    "Your antibiotics are ready but I need to check with your doctor first.",
    "It will be ready once your doctor confirms.",
    "I can't say your medicine is ready yet.",
  ])("is not flagged when negated, asked, conditional or paired with a hold: %s", (text) => {
    expect(talk("case-1", [text]).turns[0].state.unsafeAdvice).toEqual([]);
  });

  it("is simply welcomed in a dispense case", () => {
    const { turns } = talk("case-2", ["Your warfarin is ready."]);
    expect(turns[0].state.unsafeAdvice).toEqual([]);
    expect(turns[0].reply.text).toMatch(/thank/i);
  });

  it("treats a bare 'yes' to the opening question as saying it's ready", () => {
    expect(talk("case-1", ["Yes"]).turns[0].state.unsafeAdvice.map((f) => f.id)).toContain("supply_before_clarification");
  });
});

describe("the patient's concern follows the conversation, not a timer", () => {
  it("asks whether it's ready before any hold is mentioned", () => {
    const { turns } = talk("case-1", ["Hi, I'm Sam, the pharmacist.", "Can I confirm your full name?", "Any allergies to medicines?"]);
    const said = turns.map((t) => t.reply.text).join(" ");
    expect(said).toMatch(/ready for me to take home/i);
    expect(said).not.toMatch(/why can't i collect/i);
  });

  it("asks why once the student has signalled a hold", () => {
    const { turns } = talk("case-1", ["Hi there", "It's a bit too early for this repeat", "Thanks for waiting"]);
    expect(turns.map((t) => t.reply.text).join(" ")).toMatch(/why can't i collect/i);
  });

  it("drops the collecting concern once told (wrongly) that it's ready", () => {
    const { turns } = talk("case-1", ["Your antibiotics are ready.", "Can I confirm your name?", "Any allergies?", "What other medicines do you take?"]);
    const said = turns.map((t) => t.reply.text).join(" ");
    expect(said).not.toMatch(/why can't i collect|ready for me to take home/i);
  });

  it("keeps patient-initiated concerns in dispense cases", () => {
    const { turns } = talk("case-2", ["Hi, I'm Sam.", "Can I confirm your name?", "Any allergies?"]);
    expect(turns.map((t) => t.reply.text).join(" ")).toMatch(/ibuprofen/i);
  });

  it("reacts to 'not ready yet', then combines the explanation that follows", () => {
    const { turns } = talk("case-1", [
      "Your antibiotics aren't ready yet",
      "It was only dispensed four days ago so it's too early, and I can't supply it until I've called your doctor.",
    ]);
    expect(turns[0].reply.text).toMatch(/problem|wrong|why/i);
    expect(turns[0].unrecognised).toBe(false);
    expect(turns[1].state.addressed.has("explain_hold")).toBe(true);
  });
});

describe("small talk, procedure and repair", () => {
  it.each([
    ["One moment, let me check your record", /sure|take your time/i],
    ["Thanks for waiting", /okay|problem/i],
    ["Thanks!", /welcome|worries/i],
    ["Sorry to hear that", /thanks/i],
  ])("answers %s naturally", (text, pattern) => {
    const { turns } = talk("case-2", [text]);
    expect(turns[0].reply.text).toMatch(pattern);
    expect(turns[0].unrecognised).toBe(false);
  });

  it("never repeats the same 'I didn't follow' line back to back, and never says 'instruction'", () => {
    const { turns } = talk("case-2", ["blah blah the weather is nice", "totally unrelated remark here", "another random thing"]);
    for (const turn of turns) {
      expect(turn.unrecognised).toBe(true);
      expect(turn.reply.text).not.toMatch(/instruction/i);
    }
    expect(turns[0].reply.text).not.toBe(turns[1].reply.text);
    expect(turns[1].reply.text).not.toBe(turns[2].reply.text);
  });

  it("uses question wording when an unrecognised message is a question", () => {
    expect(talk("case-2", ["What do you reckon about the footy?"]).turns[0].reply.text).toMatch(/asking|want to know|ask me/i);
  });
});

describe("fallback lines never give away a case's teaching point", () => {
  it.each([
    ["case-9", /prescription|concerning|number/i],
    ["case-10", /weekly|daily/i],
    ["case-11", /dehydrat/i],
  ])("%s", (id, leak) => {
    for (const line of getConversationCase(id).unknownReplies) expect(line).not.toMatch(leak);
  });
});

describe("determinism", () => {
  it("replays the same dialogue state from the transcript alone", () => {
    const lines = ["Hi My name is Hiranya", "Your Antibitoics are ready", "What is your name and age", "blah", "Thanks!"];
    const { c, state } = talk("case-1", lines, false);
    expect(replayConversation(c, asTranscript(lines))).toEqual(state);
  });

  it("reads dialogue acts identically each time", () => {
    const text = "Hi, I'm Hiranya. Your antibiotics are ready.";
    expect(readDialogueActs(text, true)).toEqual(readDialogueActs(text, true));
  });
});
