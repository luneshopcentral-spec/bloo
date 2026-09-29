import type { ConversationCase } from "./types";
import { STATIC_CASES } from "@/lib/cases/static-cases";

const PATIENT_QUESTION_TOPICS: Record<string, string> = {
  "case-1": "next_steps", "case-2": "bleeding_safety", "case-3": "storage",
  "case-4": "next_steps_empathy", "case-5": "next_steps", "case-6": "sun_precautions",
  "case-7": "respiratory_red_flags", "case-8": "interim_plan", "case-9": "independent_contact",
  "case-10": "explain_hold", "case-11": "urgent_plan", "case-12": "bleeding_interaction",
  "case-13": "hypo_advice",
};

const HOLD_CLARIFICATIONS: Record<string, string> = {
  "case-5": "Is the concern about my other medicines or kidney results? What happens while you check?",
  "case-8": "Is there a safety concern with this patch? What will you check with my doctor?",
  "case-9": "Is there a problem with the prescriber details? How will you verify them?",
  "case-10": "Is the daily direction the concern? I normally take this once a week.",
};

/** Authored dialogue fixes, applied once so browser and server use identical cases. */
export function refineConversationCases(cases: Record<string, ConversationCase>) {
  for (const c of Object.values(cases)) {
    const address = STATIC_CASES.find(item => item.id === c.caseId)?.patientLookup.prescriptionPatient.address;
    if (address) c.responseIntents.push({
      id: "patient_address",
      answerAlongsideTopics: true,
      fallbackPatterns: [String.raw`\b(?:what|which|confirm|check|tell me|give me|verify)\b.{0,30}\b(?:your|patient'?s)?\s*address\b`, String.raw`\b(?:where do you live|what is your home address)\b`],
      patientReplies: [`My address is ${address.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())}.`],
    });
    c.disposition = [1, 4, 5, 8, 9, 10, 11, 12].includes(Number(c.caseId.slice(5)))
      ? "hold_contact_prescriber" : "dispense";
    c.patientQuestionTopicId = PATIENT_QUESTION_TOPICS[c.caseId];
    if (c.disposition === "hold_contact_prescriber") c.responseIntents.unshift({
      id: "hold_readiness",
      answerAlongsideTopics: true,
      fallbackPatterns: [String.raw`\b(?:when|how long)\b.{0,40}\b(?:ready|collect|pick up|receive|have it)\b`],
      patientReplies: ["I'm not sure yet. Will you let me know after you've checked what happens next?"],
    });
    const topic = (id: string) => c.topics.find(t => t.id === id)!;
    topic("confirm_identity").fallbackPatterns.push(String.raw`\b(?:what (?:you are|you re|you'?re|are you) called|who am i (?:speaking|talking) (?:to|with)|name (?:please|for the prescription))\b`);
    topic("confirm_identity").fallbackPatterns.push(String.raw`\b(?:what should i call you|may i have your name|who is (?:the prescription|the medicine|this) for)\b`);
    topic("confirm_age").fallbackPatterns.push(String.raw`\b(?:when were you born|birthdate|born on)\b`);
    topic("confirm_identity").fallbackPatterns.push(String.raw`\bwhat (?:name do you go by|do you go by)\b`);
    topic("confirm_age").fallbackPatterns.push(String.raw`\bwhen you were born\b`);
    topic("allergies").fallbackPatterns.push(String.raw`\breactions?\b.*\b(?:medicine|tablets?|antibiotics?)\b`, String.raw`\bhad (?:any )?problems with (?:medicine|tablets?|antibiotics?) (?:before|in the past)\b`);
    topic("current_medicines").fallbackPatterns.push(String.raw`\bare you (?:taking|using|on) anything else\b`, String.raw`\banything else (?:you (?:take|use|are taking|are using)|do you (?:take|use))\b`);
    topic("allergies").fallbackPatterns.push(String.raw`\b(?:bad|unusual|unwanted) reaction\b.*\b(?:medicine|tablets?|antibiotics?)\b`, String.raw`\b(?:medicine|tablets?|antibiotics?)\b.*\b(?:disagreed with|made you (?:ill|unwell)|reaction)\b`);
    topic("current_medicines").fallbackPatterns.push(String.raw`\b(?:what|which)\b.*\b(?:medicine|tablets?|pills?|treatments?)\b.*\b(?:taking|take|using|use|on)\b`);
    topic("current_medicines").fallbackPatterns.push(String.raw`\bwhat else\b.*\b(?:take|taking|using|use|on)\b`, String.raw`\bare you on any (?:tablets?|pills?|treatments?)\b`, String.raw`\banything\b.*\b(?:chemist|supermarket|over the counter)\b`);
    topic("current_medicines").fallbackPatterns.push(String.raw`\b(?:run|talk|go)\b.*\bthrough\b.*\bmedicine\b`, String.raw`\bmedicine (?:you|that you) (?:currently |usually |normally )?(?:take|use|are taking)\b`, String.raw`\bwhat\b.*\btake (?:day to day|daily|every day)\b`);
    topic("allergies").fallbackPatterns.push(String.raw`\bmedicine\b.*\b(?:caused|given)\b.*\b(?:reaction|rash|allergy)\b`);
    c.responseIntents.find(i => i.id === "previous_use")?.fallbackPatterns.push(String.raw`\bwhen\b.*\b(?:last|previously)\b.*\b(?:collect|supply|dispens|take|took|use)\w*\b`);
    c.responseIntents.find(i => i.id === "previous_use")?.fallbackPatterns.push(String.raw`\bis this (?:the|your) first time\b`);
    c.responseIntents.find(i => i.id === "medical_conditions")?.fallbackPatterns.push(String.raw`\b(?:health|medical) (?:issues?|problems?)\b`);
    const symptoms = c.responseIntents.find(i => i.id === "current_symptoms");
    symptoms?.fallbackPatterns.push(String.raw`\b(?:are you|have you|do you|any)\b.*\b(?:nauseous|queasy|feeling sick|unwell)\b`);
    c.unsafeAdviceRules.find(r => r.id === "double_dose")?.patterns.push(
      String.raw`\bdouble (?:your|the|a|next) dose\b`,
      String.raw`\btake (?:a |the )?double dose\b`,
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
      c.responseIntents.unshift({
        id: "early_repeat_reason",
        answerAlongsideTopics: true,
        fallbackPatterns: [String.raw`\bwhy\b.{0,30}\b(?:early|soon|repeat|here again)\b`, String.raw`\b(?:when|how long ago)\b.{0,30}\b(?:last|previously)\b.{0,20}\b(?:collect|pick up|dispens)\w*\b`],
        patientReplies: ["I collected my last supply four days ago. I came in because I thought this repeat might be ready."],
      });
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
      c.responseIntents.find(i => i.id === "current_symptoms")!.patientReplies = ["I'm not feeling nauseous at the moment. I still have the symptoms I saw the doctor about, but no chest pain or breathing trouble."];
      c.doseRules = [{ topicId: "directions", amountPattern: String.raw`\b(?:one|1) capsule`, frequencyPattern: String.raw`\b(?:four times (?:a|per) day|four times daily|every (?:six|6) hours|qid)\b` }];
      for (const id of ["directions", "complete_course", "nausea_advice"]) {
        topic(id).assessed = false;
        topic(id).critical = false;
      }
      topic("purpose").teachBackReply = "The antibiotic is for the infection my doctor diagnosed.";
      // Optional dose discussion must still match the actual prescribed dose.
      topic("directions").forbiddenPatterns?.push(String.raw`\b(?:four|five|six|seven|eight|nine|[4-9]) capsules?\b`);
      c.topics.splice(c.topics.length - 2, 0, {
        id: "explain_hold", label: "Explain the early repeat and hold supply for prescriber clarification",
        category: "clinical_counselling", critical: true,
        examples: ["The repeat is too early. I cannot supply it today until I contact your prescriber.", "I need to hold this supply and speak with your doctor because it was dispensed four days ago."],
        fallbackPatterns: [String.raw`\b(?:early|too soon|ahead of schedule|recent|four days|4 days)\b`],
        // Contact verbs take any inflection: "called", "phoned", "spoke", "checking".
        requiredPatternGroups: [[String.raw`\b(?:early|too soon|ahead of schedule|recent|four days|4 days)\b`], [String.raw`\b(?:hold|cannot (?:supply|hand (?:it|this) over)|not supply|before.{0,20}(?:supply|dispense|dispensing))\b`], [String.raw`\b(?:contact|speak|spoke|spoken|call|ring|rang|phone|check|clarify|talk|confirm|verify|query)\w*\b.*\b(?:doctor|prescriber)\b`]],
        patientReplies: ["I didn't realise the repeat was too early. I understand you need to check with my doctor before supplying it.", "Okay, please check the recent supply with my doctor first."],
        teachBackReply: "The repeat is too early, so you are holding it while you check with my doctor.",
      }, {
        id: "next_steps", label: "Explain the follow-up and how the patient will be updated",
        category: "communication",
        examples: ["I will contact your prescriber and update you before anything is supplied.", "We will let you know the outcome after speaking with your doctor."],
        fallbackPatterns: [String.raw`\b(?:update you|let you know|get back to you|call you|phone you|keep you informed)\b`],
        requiredPatternGroups: [[String.raw`\b(?:doctor|prescriber|outcome|after|before)\b`]],
        patientReplies: ["Thank you. I'll wait to hear the outcome before collecting the repeat.", "Okay, please let me know once you have spoken to the doctor."],
        teachBackReply: "You will update me after speaking with the doctor, before anything is supplied.",
      });
    }
    if (c.caseId === "case-4") {
      topic("explain_hold").clarificationPrompt = "What do you need to check with my doctor before I can collect it?";
      topic("current_medicines").patientReplies = ["I take sertraline for anxiety. I also sometimes try things to help me sleep.", "Sertraline is my regular prescription medicine, for anxiety."];
      topic("current_medicines").repeatReply = topic("current_medicines").patientReplies[0];
      topic("sedative_alcohol_history").patientReplies = ["My record says I had stopped drinking, but I've started again recently. I have a few drinks most nights when I can't sleep.", "I was in remission, but recently I've been drinking most evenings again. I haven't updated the pharmacy about that yet."];
      c.patientQuestionTopicId = "next_steps_empathy";
      topic("explain_hold").teachBackReply = "You need to hold this prescription and clarify the treatment plan with my doctor before supplying it.";
      topic("next_steps_empathy").teachBackReply = "You will let me know the outcome after speaking with my doctor.";
    }
    if (c.caseId === "case-2") {
      c.responseIntents.unshift({
        id: "ibuprofen_use",
        answerAlongsideTopics: true,
        fallbackPatterns: [String.raw`\b(?:do|did|have|are) you\b.{0,35}\b(?:take|taking|use|using|taken|used)\b.{0,15}\b(?:ibuprofen|nurofen)\b`],
        patientReplies: ["Yes, I sometimes take ibuprofen for headaches. Is it safe with my warfarin?"],
      });
      topic("interactions").requiredPatternGroups![0].push(String.raw`\b(?:starting|stopping|start|stop) medicine\b`);
      topic("interactions").fallbackPatterns.push(String.raw`\bcheck\b.*\bpharmacist\b.*\b(?:starting|stopping) medicine\b`);
    }
    if (HOLD_CLARIFICATIONS[c.caseId]) topic("explain_hold").clarificationPrompt = HOLD_CLARIFICATIONS[c.caseId];
    if (c.caseId === "case-9") topic("explain_hold").fallbackPatterns.push(
      String.raw`\b(?:verify|authenticate|check)\b.*\b(?:prescriber|doctor)\b`
    );
    if (c.caseId === "case-10") topic("explain_hold").fallbackPatterns.push(
      String.raw`\b(?:cannot|hold|not)\b.*\b(?:give|supply|dispense)\b`
    );
    if (c.caseId === "case-3") c.responseIntents.find(i => i.id === "diagnosis_question")?.fallbackPatterns.push(
      String.raw`\bwhat\b.{0,20}\b(?:he|liam)\b.{0,25}\b(?:treated for|taking (?:this|it) for)\b`,
      String.raw`\bwhy\b.{0,20}\b(?:he|liam)\b.{0,25}\b(?:prescribed|given)\b`
    );
    if (c.caseId === "case-3") c.responseIntents.unshift({
      id: "illness_duration_uncertain",
      answerAlongsideTopics: true,
      fallbackPatterns: [String.raw`\bhow long\b.{0,40}\b(?:he|liam)\b.{0,20}\b(?:ill|sick|unwell)\b`],
      patientReplies: ["I'm not sure of the exact number of days. The doctor has seen him about this infection."],
    });
    if (c.caseId === "case-11") c.responseIntents.unshift({
      id: "illness_duration",
      answerAlongsideTopics: true,
      fallbackPatterns: [String.raw`\bhow long\b.{0,45}\b(?:stomach bug|ill|sick|vomit|diarrh)\w*\b`, String.raw`\bwhen did\b.{0,35}\b(?:stomach bug|vomit|diarrh)\w*\b`],
      patientReplies: ["It started two days ago. I've had vomiting and diarrhoea since then."],
    });
    if (c.caseId === "case-11") topic("toxicity_assessment").partialQuestionReplies = [
      { pattern: String.raw`\b(?:ibuprofen|nurofen|naproxen|nsaid)\b`, reply: "Yes, I've taken ibuprofen for the aches during this stomach bug." },
      { pattern: String.raw`\b(?:tremor|shak|unsteady|balance|confus)\w*\b`, reply: "My hands are shakier than usual and I feel unsteady." },
      { pattern: String.raw`\b(?:vomit|diarrh|dehydrat|fluid|drink)\w*\b`, reply: "I've had vomiting and diarrhoea and can barely keep fluids down." },
    ];
    if (c.caseId === "case-12") c.responseIntents.unshift({
      id: "previous_apixaban_dose",
      answerAlongsideTopics: true,
      fallbackPatterns: [String.raw`\b(?:what|which|how much)\b.{0,30}\b(?:previous|old|last|usual|before)\b.{0,15}\b(?:dose|strength|tablet)\b`, String.raw`\b(?:what|which) dose\b.{0,15}\b(?:before|previously)\b`],
      patientReplies: ["My previous Eliquis box was 2.5 milligrams, taken twice a day."],
    });
    if (c.caseId === "case-12") topic("dose_factors").partialQuestionReplies = [
      { pattern: String.raw`\b(?:weight|weigh|kilograms?|kg)\b`, reply: "I weigh 54 kilograms." },
      { pattern: String.raw`\b(?:kidney|renal|creatinine|egfr)\b`, reply: "My kidney function is reduced. The last creatinine number I was given was 168." },
      { pattern: String.raw`\b(?:atrial fibrillation|af|what.*for|why.*(?:take|on))\b`, reply: "I take Eliquis for atrial fibrillation." },
    ];
    if (c.caseId === "case-12") topic("dose_factors").fallbackPatterns.push(
      String.raw`\bwhy (?:do|are) you (?:take|taking)\b`,
      String.raw`\bwhat is (?:the |this |your )?(?:eliquis|apixaban|blood thinner) (?:for|treating)\b`
    );
    if (c.caseId === "case-6") {
      c.concernPrompt = "Can I take the doxycycline and my antacid together?";
      // Keep the water requirement; correct the incomplete example instead of
      // giving full credit for only half of this safety-critical instruction.
      topic("water_upright").examples[1] = "Use a full glass of water and do not lie down for 30 minutes after taking doxycycline.";
      c.doseRules = [{ topicId: "directions", amountPattern: String.raw`\b(?:one|1) tablet`, frequencyPattern: String.raw`\b(?:twice (?:a|per) day|twice daily|every (?:twelve|12) hours|bd|morning and (?:night|evening))\b` }];
    }
    // Hold cases whose concern is about taking the medicine home today. Before
    // the student has mentioned any hold, the patient asks whether it is ready;
    // "why can't I…?" only follows once they've been told. If the student
    // (wrongly) says it's ready, the concern is dropped — the patient believes it.
    const collectingConcerns: Record<string, string | undefined> = {
      "case-1": "So is my repeat ready for me to take home today?",
      "case-4": "So can I take the sleeping tablets home with me today?",
      "case-5": undefined,
      "case-8": "So is the patch ready for me to take home now?",
      "case-9": "So is Noah's medicine ready to take home today?",
    };
    if (c.caseId in collectingConcerns) {
      c.concernAboutCollecting = true;
      const uninformed = collectingConcerns[c.caseId];
      if (uninformed) c.concernPromptUninformed = uninformed;
    }
    if (c.caseId === "case-3") c.doseRules = [{ topicId: "directions", amountPattern: String.raw`\b(?:ten|10)\s*ml\b`, frequencyPattern: String.raw`\b(?:three times (?:a|per) day|three times daily|every (?:eight|8) hours|tds)\b` }];
    if (c.caseId === "case-7") c.doseRules = [{ topicId: "directions_mr", amountPattern: String.raw`\b(?:one|1) (?:20 (?:mg|milligram) )?tablet`, frequencyPattern: String.raw`\b(?:twice (?:a|per) day|twice daily|every (?:twelve|12) hours|bd)\b` }];
  }
}
