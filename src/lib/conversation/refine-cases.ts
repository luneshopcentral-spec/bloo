import type { ConversationCase } from "./types";

/** Authored dialogue fixes, applied once so browser and server use identical cases. */
export function refineConversationCases(cases: Record<string, ConversationCase>) {
  for (const c of Object.values(cases)) {
    c.disposition = [1, 4, 5, 8, 9, 10, 11, 12].includes(Number(c.caseId.slice(5)))
      ? "hold_contact_prescriber" : "dispense";
    const topic = (id: string) => c.topics.find(t => t.id === id)!;
    topic("confirm_identity").fallbackPatterns.push(String.raw`\b(?:what (?:you are|you re|you'?re|are you) called|who am i (?:speaking|talking) (?:to|with)|name (?:please|for the prescription))\b`);
    topic("confirm_age").fallbackPatterns.push(String.raw`\b(?:when were you born|birthdate|born on)\b`);
    topic("allergies").fallbackPatterns.push(String.raw`\b(?:bad|unusual|unwanted) reaction\b.*\b(?:medicine|tablet|antibiotic)\b`, String.raw`\b(?:medicine|tablet|antibiotic)\b.*\b(?:disagreed with|made you (?:ill|unwell)|reaction)\b`);
    topic("current_medicines").fallbackPatterns.push(String.raw`\b(?:what|which)\b.*\b(?:medicine|tablets?|pills?|treatments?)\b.*\b(?:taking|take|using|use|on)\b`);
    const symptoms = c.responseIntents.find(i => i.id === "current_symptoms");
    symptoms?.fallbackPatterns.push(String.raw`\b(?:are you|have you|do you|any)\b.*\b(?:nauseous|queasy|feeling sick|unwell)\b`);
    c.unsafeAdviceRules.find(r => r.id === "double_dose")?.patterns.push(
      String.raw`\bdouble (?:your|the|a|next) dose\b`,
      String.raw`\btake (?:twice|double) (?:your|the) (?:usual |normal )?(?:amount|dose)\b`
    );
    // These old expressions could cross an entire risk explanation and match
    // its final words "make sure the plan is safe" as permission to drink.
    for (const rule of c.unsafeAdviceRules) {
      if (rule.id === "temazepam_alcohol_safe") rule.patterns = [
        String.raw`\b(?:alcohol|drinking|drink) (?:is|are) (?:fine|safe|okay|ok)\b`,
        String.raw`\byou can drink\b.*\b(?:temazepam|sleeping tablet|tonight)\b`,
      ];
    }
    if (c.caseId === "case-1") {
      c.handoverGoal = "Explain the early repeat, hold supply while contacting the prescriber, and agree what happens next.";
      c.concernTopicId = "explain_hold";
      c.concernPrompt = "But I have come in for the repeat. Why can't I collect it today?";
      c.patientQuestion = "What happens next, and how will I hear back?";
      c.patientQuestionTopicId = "next_steps";
      topic("allergies").patientReplies = ["Penicillin gave me a rash. It's on my pharmacy record.", "Yes, penicillin — I got a rash when I took it."];
      topic("allergies").repeatReply = topic("allergies").patientReplies[0];
      topic("current_medicines").patientReplies = ["I take amlodipine 5 mg once a day for my blood pressure.", "Amlodipine, 5 mg each day. That's my regular blood pressure tablet."];
      topic("current_medicines").repeatReply = topic("current_medicines").patientReplies[0];
      c.responseIntents.find(i => i.id === "previous_use")!.patientReplies = ["Yes, I collected erythromycin here recently. I'm here about the repeat.", "Yes, I have had a recent supply of this antibiotic from this pharmacy."];
      c.responseIntents.find(i => i.id === "medical_conditions")!.patientReplies = ["I have high blood pressure and take amlodipine for it.", "High blood pressure is on my pharmacy record."];
      for (const id of ["directions", "complete_course", "nausea_advice"]) {
        topic(id).assessed = false;
        topic(id).critical = false;
      }
      // Optional dose discussion must still match the actual prescribed dose.
      topic("directions").forbiddenPatterns?.push(String.raw`\b(?:four|five|six|seven|eight|nine|[4-9]) capsules?\b`);
      c.topics.splice(c.topics.length - 2, 0, {
        id: "explain_hold", label: "Explain the early repeat and hold supply for prescriber clarification",
        category: "clinical_counselling", critical: true,
        examples: ["The repeat is too early. I cannot supply it today until I contact your prescriber.", "I need to hold this supply and speak with your doctor because it was dispensed four days ago."],
        fallbackPatterns: [String.raw`\b(?:early|recent|four days|4 days)\b`],
        requiredPatternGroups: [[String.raw`\b(?:early|recent|four days|4 days)\b`], [String.raw`\b(?:hold|cannot supply|not supply|before.{0,20}supply)\b`], [String.raw`\b(?:contact|speak|call|check|clarify)\b.*\b(?:doctor|prescriber)\b`]],
        patientReplies: ["I didn't realise the repeat was too early. I understand you need to check with my doctor before supplying it.", "Okay, please check the recent supply with my doctor first."],
      }, {
        id: "next_steps", label: "Explain the follow-up and how the patient will be updated",
        category: "communication",
        examples: ["I will contact your prescriber and update you before anything is supplied.", "We will let you know the outcome after speaking with your doctor."],
        fallbackPatterns: [String.raw`\b(?:update you|let you know|get back to you|call you)\b`],
        requiredPatternGroups: [[String.raw`\b(?:doctor|prescriber|outcome|after|before)\b`]],
        patientReplies: ["Thank you. I'll wait to hear the outcome before collecting the repeat.", "Okay, please let me know once you have spoken to the doctor."],
      });
    }
    if (c.caseId === "case-4") {
      topic("current_medicines").patientReplies = ["I take sertraline for anxiety. I also sometimes try things to help me sleep.", "Sertraline is my regular prescription medicine, for anxiety."];
      topic("current_medicines").repeatReply = topic("current_medicines").patientReplies[0];
      topic("sedative_alcohol_history").patientReplies = ["My record says I had stopped drinking, but I've started again recently. I have a few drinks most nights when I can't sleep.", "I was in remission, but recently I've been drinking most evenings again. I haven't updated the pharmacy about that yet."];
      c.patientQuestionTopicId = "next_steps_empathy";
    }
    if (c.caseId === "case-2") {
      topic("interactions").requiredPatternGroups![0].push(String.raw`\b(?:starting|stopping|start|stop) medicine\b`);
      topic("interactions").fallbackPatterns.push(String.raw`\bcheck\b.*\bpharmacist\b.*\b(?:starting|stopping) medicine\b`);
    }
    if (c.caseId === "case-6") {
      // Keep the water requirement; correct the incomplete example instead of
      // giving full credit for only half of this safety-critical instruction.
      topic("water_upright").examples[1] = "Use a full glass of water and do not lie down for 30 minutes after taking doxycycline.";
    }
  }
}
