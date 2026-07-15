import type {
  ConversationCase,
  ConversationResponseIntent,
  ConversationTopic,
  UnsafeAdviceRule,
} from "./types";

interface CommonTopicFacts {
  nameReply: string;
  ageReply: string;
  allergiesReply: string;
  medicinesReply: string;
  medicinesCritical?: boolean;
}

function commonTopics(facts: CommonTopicFacts): ConversationTopic[] {
  return [
    {
      id: "introduction",
      label: "Introduce yourself and explain the handover",
      category: "communication",
      examples: [
        "Hello, I am the pharmacist and I would like to talk through your medicine.",
        "Hi, my name is Alex. I am the pharmacist looking after you today.",
      ],
      fallbackPatterns: [
        "\\b(?:hello|hi|good (?:morning|afternoon))\\b.*\\b(?:pharmacist|pharmacy)\\b",
        "\\bmy name is\\b.*\\b(?:pharmacist|pharmacy)\\b",
      ],
      patientReplies: ["Hello. Yes, that would be helpful.", "Hi. Okay, I'm listening."],
      repeatReply: "Yes, hello again.",
    },
    {
      id: "confirm_identity",
      label: "Confirm the patient's full name",
      category: "information_gathering",
      critical: true,
      examples: [
        "Could I confirm your full name?",
        "Before we start, can you tell me the patient's name?",
        "Can I check who this medicine is for?",
      ],
      fallbackPatterns: [
        "\\bconfirm\\b.*\\b(?:name|identity)\\b",
        "\\b(?:your|patient'?s) (?:full )?name\\b",
        "\\bwho (?:is|was) this (?:medicine|prescription) for\\b",
      ],
      patientReplies: [facts.nameReply],
      repeatReply: facts.nameReply,
    },
    {
      id: "confirm_age",
      label: "Confirm the patient's date of birth or age",
      category: "information_gathering",
      critical: true,
      examples: [
        "Could I confirm your date of birth?",
        "How old are you?",
        "Can I check the patient's age or date of birth?",
      ],
      fallbackPatterns: [
        "\\b(?:date of birth|birth date|birthday|dob)\\b",
        "\\bhow old\\b",
        "\\b(?:your|patient'?s|child'?s|son'?s|daughter'?s) age\\b",
        "\\bconfirm\\b.*\\bage\\b",
      ],
      patientReplies: [facts.ageReply],
      repeatReply: facts.ageReply,
    },
    {
      id: "allergies",
      label: "Ask about medicine allergies and previous reactions",
      category: "information_gathering",
      critical: true,
      examples: [
        "Do you have any allergies to medicines?",
        "Have you ever reacted badly to a medication?",
        "Are there any medicines you cannot take?",
      ],
      fallbackPatterns: [
        "\\ballerg(?:y|ies|ic)\\b",
        "\\breact(?:ed|ion)?\\b.*\\b(?:medicine|medication|drug|antibiotic)\\b",
        "\\bmedicines?\\b.*\\b(?:cannot|can't) take\\b",
      ],
      forbiddenPatterns: [
        "\\byou (?:do not|don't) have (?:any )?allerg",
        "\\byou have no allerg",
      ],
      patientReplies: [facts.allergiesReply],
      repeatReply: facts.allergiesReply,
    },
    {
      id: "current_medicines",
      label: "Ask about other medicines and relevant products",
      category: "information_gathering",
      critical: facts.medicinesCritical ?? false,
      examples: [
        "What other medicines do you take, including vitamins or herbal products?",
        "Are you using any prescription, over-the-counter or complementary medicines?",
        "Could you tell me about your other regular medications?",
      ],
      fallbackPatterns: [
        "\\bother\\b.*\\b(?:medicine|medication|tablet|drug)\\b",
        "\\b(?:vitamin|supplement|herbal|over the counter|otc)\\b",
        "\\bwhat (?:else )?(?:do you|does .*?) take\\b",
        "\\bregular (?:medicine|medication|tablet)s?\\b",
      ],
      patientReplies: [facts.medicinesReply],
      repeatReply: facts.medicinesReply,
    },
  ];
}

interface CommonResponseFacts {
  previousUseReplies: string[];
  conditionsReplies: string[];
  symptomsReplies: string[];
}

function commonResponseIntents(facts: CommonResponseFacts): ConversationResponseIntent[] {
  return [
    {
      id: "permission_to_ask",
      fallbackPatterns: [
        "\\b(?:can|could|may) i (?:ask|check)\\b",
        "\\b(?:a couple of|some|few) questions\\b",
        "\\bis (?:that|it) (?:okay|ok) if i\\b",
      ],
      patientReplies: [
        "Of course. What would you like to ask?",
        "Yes, that's fine. Go ahead.",
        "Sure, I'm happy to answer a few questions.",
      ],
    },
    {
      id: "previous_use",
      fallbackPatterns: [
        "\\b(?:taken|used|had|been on)\\b.*\\b(?:before|previously|in the past)\\b",
        "\\bfirst time\\b.*\\b(?:medicine|medication|drug|antibiotic|tablet|capsule)\\b",
        "\\btaken before\\b",
      ],
      patientReplies: facts.previousUseReplies,
    },
    {
      id: "medical_conditions",
      fallbackPatterns: [
        "\\b(?:medical|health) conditions?\\b",
        "\\bother conditions?\\b",
        "\\bmedical history\\b",
        "\\b(?:heart|kidney|renal|liver|breathing) (?:condition|conditions|problem|problems)\\b",
      ],
      patientReplies: facts.conditionsReplies,
    },
    {
      id: "current_symptoms",
      fallbackPatterns: [
        "\\b(?:do|does|did|are|is|has|have)\\b.*\\b(?:chest pain|symptom|symptoms|fever|cough|pain|vomit|vomiting|diarrh(?:ea|oea)|nausea)\\b",
        "\\bany\\b.*\\b(?:chest pain|symptom|symptoms|fever|cough|pain|vomit|vomiting|diarrh(?:ea|oea)|nausea)\\b",
        "\\bhow (?:are|have) you (?:been )?feel(?:ing)?\\b",
      ],
      patientReplies: facts.symptomsReplies,
    },
    {
      id: "side_effect_explanation",
      fallbackPatterns: [
        "\\b(?:may|might|can|could)\\b.*\\b(?:nausea|feel sick|upset stomach|drows|sleepy|diarrh(?:ea|oea)|headache)\\w*\\b",
        "\\bcommon side effects?\\b",
      ],
      patientReplies: [
        "Okay. What should I do if that happens?",
        "Thanks for explaining that. I’ll keep an eye out for it.",
        "All right. Is there anything that would mean I should seek help?",
      ],
    },
    {
      id: "courtesy_close",
      fallbackPatterns: [
        "\\b(?:thank you|thanks|goodbye|bye|take care)\\b",
        "\\bthat(?:'s| is) all\\b",
      ],
      patientReplies: [
        "Thank you for taking the time to explain it. Goodbye.",
        "Thanks. I feel clearer about the plan now.",
        "Thank you. I’ll follow the label and contact the pharmacy if I’m unsure.",
      ],
      suppressConcern: true,
    },
    {
      id: "acknowledgement",
      fallbackPatterns: [
        "^(?:okay|ok|great|good|all right|alright|understood)[.! ]*$",
        "\\bglad (?:that|to)\\b",
      ],
      patientReplies: [
        "Okay. Is there anything else I need to know?",
        "All right, I’m listening.",
      ],
      suppressConcern: true,
    },
  ];
}

function variedUnknownReplies(...caseSpecific: string[]): string[] {
  return [
    ...caseSpecific,
    "I'm not sure how that relates to this medicine. Could you rephrase the question?",
    "Could you ask that in a different way? I'm not sure what information you need.",
    "I didn't quite follow that. Could you explain why you're asking?",
    "I'm not certain what you mean. Could you use a little more detail?",
  ];
}

function closingTopics(teachBackReply: string): ConversationTopic[] {
  return [
    {
      id: "teach_back",
      label: "Use teach-back: ask the patient to explain the plan",
      category: "communication",
      examples: [
        "Just so I know I explained it clearly, can you tell me how you will use it?",
        "Could you talk me through what you will do when you get home?",
        "Can you repeat the plan back to me in your own words?",
      ],
      fallbackPatterns: [
        "\\b(?:tell|talk|run) me through\\b.*\\b(?:take|use|plan|do)\\b",
        "\\brepeat\\b.*\\b(?:back|your own words)\\b",
        "\\bhow (?:will|are) you\\b.*\\b(?:take|use|manage)\\b",
        "\\bcheck (?:that )?I (?:explained|was clear)\\b",
        "\\bin your own words\\b",
        "\\b(?:show|tell|explain|describe)\\b.*\\bhow\\b.*\\b(?:take|use|give|measure|store|follow)\\b",
        "\\bwhat will you do\\b.*\\b(?:medicine|dose|home|next)\\b",
      ],
      patientReplies: [teachBackReply],
      repeatReply: teachBackReply,
      feedback: "Teach-back is not ‘Do you understand?’. Ask the patient or carer to describe the dose or plan back in their own words, for example: “Just so I know I explained it clearly, can you tell me how you’ll give each dose?”",
    },
    {
      id: "invite_questions",
      label: "Invite questions and close professionally",
      category: "communication",
      examples: [
        "What questions do you have for me?",
        "Is there anything else you would like to ask before you go?",
        "Do you have any concerns or questions about the plan?",
      ],
      fallbackPatterns: [
        "\\bwhat questions\\b",
        "\\bany (?:other )?(?:questions|concerns)\\b",
        "\\banything else\\b.*\\b(?:ask|know|concern)\\b",
      ],
      patientReplies: ["I do have one question before I go."],
      repeatReply: "No other questions, thank you.",
    },
  ];
}

const COMMON_UNSAFE_ADVICE: UnsafeAdviceRule[] = [
  {
    id: "double_dose",
    label: "Unsafe missed-dose advice",
    patterns: [
      "\\b(?:you can|you should|go ahead and)\\s+(?:take\\s+)?(?:a\\s+)?double dose\\b",
    ],
    detail: "The student advised taking a double dose. Missed-dose advice must not encourage dose doubling.",
  },
  {
    id: "unqualified_emergency_reassurance",
    label: "Unsafe reassurance",
    patterns: [
      "\\b(?:ignore|do not worry about|don't worry about)\\b.*\\b(?:breathing|swelling|severe bleeding|collapse)\\b",
    ],
    detail: "The student dismissed a potentially urgent symptom instead of providing safety-netting.",
  },
];

function withCommonUnsafe(...rules: UnsafeAdviceRule[]): UnsafeAdviceRule[] {
  return [...COMMON_UNSAFE_ADVICE, ...rules];
}

export const CONVERSATION_CASES: Record<string, ConversationCase> = {
  "case-1": {
    caseId: "case-1",
    patientRole: "John Smith",
    openingMessage: "Hi, I’m John. Is my antibiotic ready?",
    handoverGoal: "Counsel John about the erythromycin supply and check that he can use it safely.",
    concernAfterTurns: 3,
    concernTopicId: "complete_course",
    concernPrompt: "I usually feel better after a few days. Can I stop it then?",
    patientQuestion: "If it makes me feel sick, is there anything I can do?",
    unknownReplies: variedUnknownReplies(
      "Sorry, I'm not quite sure what you mean. Could you explain that another way?"
    ),
    responseIntents: [
      {
        id: "wrong_dosage_form_advice",
        fallbackPatterns: [
          "\\b(?:shake|refrigerat|fridge)\\w*\\b",
        ],
        patientReplies: [
          "This is a capsule, isn't it? What exactly would I need to shake or refrigerate?",
          "I thought these were capsules. Could you check those storage instructions?",
        ],
      },
      ...commonResponseIntents({
        previousUseReplies: [
          "No, I don't think I've taken erythromycin before.",
          "This is my first supply of this antibiotic.",
        ],
        conditionsReplies: [
          "I have high blood pressure and high cholesterol recorded with the pharmacy.",
          "The pharmacy has my blood pressure and cholesterol history on file.",
        ],
        symptomsReplies: [
          "No chest pain. I just have the infection that my doctor assessed.",
          "Nothing like chest pain or breathing trouble—just the symptoms I saw my doctor about.",
        ],
      }),
    ],
    topics: [
      ...commonTopics({
        nameReply: "John Smith.",
        ageReply: "My date of birth is 14 March 1965.",
        allergiesReply: "I don’t have any medicine allergies that I know of.",
        medicinesReply: "I’m not taking any other regular medicines or supplements at the moment.",
      }),
      {
        id: "purpose",
        label: "Explain the medicine’s purpose",
        category: "clinical_counselling",
        examples: [
          "This is an antibiotic used to treat the infection your doctor diagnosed.",
          "Erythromycin treats bacterial infections.",
        ],
        fallbackPatterns: ["\\b(?:antibiotic|erythromycin)\\b.*\\b(?:infection|bacteria|bacterial|treat)\\b"],
        requiredPatternGroups: [["\\b(?:infection|bacteria|bacterial)\\b"]],
        patientReplies: ["Okay, that makes sense."],
      },
      {
        id: "directions",
        label: "Explain the correct dose and frequency",
        category: "clinical_counselling",
        critical: true,
        examples: [
          "Take one capsule three times a day.",
          "The label says one capsule three times daily.",
        ],
        fallbackPatterns: ["\\b(?:take|use)\\b.*\\b(?:capsule|erythromycin)\\b", "\\bthree times (?:a|per) day\\b|\\btds\\b"],
        requiredPatternGroups: [
          ["\\b(?:one|1)\\b"],
          ["\\bthree times (?:a|per) day\\b", "\\btds\\b"],
        ],
        forbiddenPatterns: ["\\b(?:two|2|four|4) capsules?\\b", "\\b(?:once|twice) daily\\b"],
        patientReplies: ["One capsule three times a day. Okay."],
      },
      {
        id: "complete_course",
        label: "Explain course completion and adherence",
        category: "clinical_counselling",
        examples: [
          "Complete the full course even if you start feeling better.",
          "Keep taking it for the prescribed course unless your doctor tells you otherwise.",
        ],
        fallbackPatterns: ["\\b(?:complete|finish)\\b.*\\b(?:course|antibiotic|medicine)\\b", "\\bkeep taking\\b.*\\bfeel better\\b"],
        forbiddenPatterns: ["\\b(?:can|should) stop\\b.*\\bfeel better\\b"],
        patientReplies: ["Right, I’ll finish the prescribed course."],
      },
      {
        id: "nausea_advice",
        label: "Explain nausea and practical administration advice",
        category: "clinical_counselling",
        examples: [
          "It may cause nausea, and taking it with food or milk may help.",
          "You can take it with food if it upsets your stomach.",
        ],
        fallbackPatterns: [
          "\\b(?:nausea|nauseous|sick|upset stomach)\\b",
          "\\b(?:food|milk)\\b.*\\b(?:nausea|stomach|sick|take)\\b",
        ],
        patientReplies: ["I’ll try it with food if my stomach feels unsettled."],
      },
      {
        id: "allergic_reaction_safety",
        label: "Provide safety-netting for a serious allergic reaction",
        category: "safety_netting",
        examples: [
          "Seek urgent help if you develop facial swelling or difficulty breathing.",
          "Get urgent medical assistance for signs of a serious allergic reaction.",
        ],
        fallbackPatterns: [
          "\\b(?:rash|swelling|breathing|allergic reaction)\\b.*\\b(?:help|urgent|doctor|hospital|emergency)\\b",
        ],
        requiredPatternGroups: [
          ["\\b(?:swelling|breathing|allergic reaction)\\b"],
          ["\\b(?:help|urgent|doctor|hospital|emergency)\\b"],
        ],
        patientReplies: ["I’ll seek help straight away if I have a serious reaction."],
      },
      ...closingTopics("I’ll take one capsule three times each day and finish the prescribed course."),
    ],
    unsafeAdviceRules: withCommonUnsafe(
      {
        id: "stop_antibiotic_early",
        label: "Unsafe antibiotic duration advice",
        patterns: ["\\b(?:you can|it is fine to|it's fine to) stop\\b.*\\b(?:feel|feeling) better\\b"],
        detail: "The student advised stopping the antibiotic simply because the patient feels better.",
      },
      {
        id: "wrong_capsule_storage_advice",
        label: "Instructions do not match the supplied dosage form",
        patterns: ["\\b(?:shake|refrigerat|fridge)\\w*\\b"],
        detail: "The student gave liquid preparation or refrigeration instructions for the erythromycin capsule supply.",
      }
    ),
  },

  "case-2": {
    caseId: "case-2",
    patientRole: "Margaret Jones",
    openingMessage: "Hello. I’m here to collect my warfarin.",
    handoverGoal: "Confirm Margaret’s dose plan and reinforce monitoring, interaction and bleeding precautions.",
    concernAfterTurns: 3,
    concernTopicId: "interactions",
    concernPrompt: "I sometimes take ibuprofen for headaches. Is that still okay?",
    patientQuestion: "What signs of bleeding should make me get help?",
    unknownReplies: variedUnknownReplies("I'm not sure I followed that. Could you say it another way?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: [
        "Yes, I've been taking warfarin for some time.",
        "Yes. This isn't my first warfarin supply.",
      ],
      conditionsReplies: [
        "I have the condition the anticoagulation clinic manages, and they monitor my warfarin.",
        "My relevant medical history is already recorded with the anticoagulation clinic.",
      ],
      symptomsReplies: [
        "I haven't noticed unusual bleeding, black stools or a recent head injury.",
        "No new bleeding or bruising symptoms today.",
      ],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Margaret Jones. Yes, the warfarin is for me.",
        ageReply: "My date of birth is 22 June 1948.",
        allergiesReply: "No known medicine allergies.",
        medicinesReply: "Warfarin is my main regular medicine. I sometimes use pain relievers for headaches.",
        medicinesCritical: true,
      }),
      {
        id: "dose_plan",
        label: "Confirm the current warfarin dose plan",
        category: "clinical_counselling",
        critical: true,
        examples: [
          "Follow the current dose plan from your anticoagulation clinic rather than taking a fixed dose from memory.",
          "Take warfarin exactly as directed on your current dosing plan.",
        ],
        fallbackPatterns: ["\\b(?:dose plan|dosing plan|warfarin booklet|anticoagulation clinic|as directed)\\b"],
        requiredPatternGroups: [["\\b(?:dose plan|dosing plan|warfarin booklet|anticoagulation clinic|as directed)\\b"]],
        patientReplies: ["I have my current dosing plan and will follow that."],
      },
      {
        id: "inr_monitoring",
        label: "Explain INR monitoring and follow-up",
        category: "clinical_counselling",
        critical: true,
        examples: [
          "Keep your INR blood tests and anticoagulation follow-up appointments.",
          "Regular INR monitoring is essential while you take warfarin.",
        ],
        fallbackPatterns: ["\\b(?:inr|blood test|anticoagulation)\\b.*\\b(?:monitor|regular|appointment|clinic|check)\\w*\\b"],
        requiredPatternGroups: [["\\b(?:inr|blood test|anticoagulation)\\b"]],
        patientReplies: ["My next INR test is booked. I’ll make sure I attend."],
      },
      {
        id: "interactions",
        label: "Cover NSAIDs, aspirin and medicine-change precautions",
        category: "safety_netting",
        critical: true,
        examples: [
          "Do not take ibuprofen, aspirin or other anti-inflammatories unless a clinician says it is safe.",
          "Check with a pharmacist before starting or stopping medicines because many interact with warfarin.",
        ],
        fallbackPatterns: [
          "\\b(?:ibuprofen|aspirin|nsaid|anti-inflammatory|anti inflammatory)\\b",
          "\\bcheck\\b.*\\b(?:pharmacist|doctor)\\b.*\\b(?:new|other|change) medicine",
        ],
        requiredPatternGroups: [
          ["\\b(?:ibuprofen|aspirin|nsaid|anti-inflammatory|anti inflammatory|new medicine|other medicine)\\b"],
          ["\\b(?:avoid|do not|don't|check|ask|before)\\b"],
        ],
        patientReplies: ["I’ll check before using ibuprofen or starting anything new."],
      },
      {
        id: "bleeding_safety",
        label: "Explain bleeding precautions and urgent warning signs",
        category: "safety_netting",
        examples: [
          "Seek urgent help for severe bleeding, black stools, vomiting blood or a significant head injury.",
          "Contact a clinician for unusual bruising or bleeding and get urgent help if bleeding will not stop.",
        ],
        fallbackPatterns: ["\\b(?:bleeding|bruising|black stools|vomit(?:ing)? blood|head injury)\\b.*\\b(?:urgent|help|doctor|hospital|emergency|contact)\\b"],
        patientReplies: ["I’ll seek help if I have serious or unusual bleeding."],
      },
      ...closingTopics("I’ll follow my current dose plan, attend my INR tests and check before taking other medicines."),
    ],
    unsafeAdviceRules: withCommonUnsafe(
      {
        id: "warfarin_nsaid",
        label: "Unsafe NSAID advice",
        patterns: ["\\b(?:ibuprofen|aspirin|nsaid)\\b.*\\b(?:is|are|'s) (?:fine|safe|okay|ok)\\b", "\\byou can take\\b.*\\b(?:ibuprofen|aspirin|nsaid)\\b"],
        detail: "The student gave unqualified reassurance about NSAID or aspirin use with warfarin.",
      },
      {
        id: "eliminate_vitamin_k",
        label: "Misleading diet advice",
        patterns: ["\\b(?:avoid|stop|never eat)\\b.*\\b(?:all )?(?:green vegetables|vitamin k)\\b"],
        detail: "The student advised eliminating vitamin K foods instead of maintaining a consistent diet and seeking individual advice.",
      }
    ),
  },

  "case-3": {
    caseId: "case-3",
    patientRole: "Liam Henderson’s parent",
    openingMessage: "Hi, I’m Liam’s mum. I’m collecting his antibiotic mixture.",
    handoverGoal: "Counsel Liam’s parent on accurate measurement, administration, storage and course completion.",
    concernAfterTurns: 3,
    concernTopicId: "liquid_handling",
    concernPrompt: "Should I use a kitchen teaspoon to measure it?",
    patientQuestion: "Where should I keep the bottle once it has been mixed?",
    unknownReplies: variedUnknownReplies("Sorry, could you explain that in simpler terms for me?"),
    responseIntents: [
      {
        id: "diagnosis_question",
        fallbackPatterns: [
          "\\bwhat (?:infection|condition|diagnosis)\\b",
          "\\bwhich infection\\b",
          "\\bwhat is (?:it|this) for\\b",
        ],
        patientReplies: [
          "The doctor said it is for the infection they examined Liam for, but I don’t know the clinical name.",
          "I was told it is for Liam’s current infection. I’m not sure of the exact diagnosis.",
        ],
      },
      ...commonResponseIntents({
        previousUseReplies: [
          "Liam has had an antibiotic before, but this is his first supply for this infection.",
          "He has used antibiotics previously, though not for this current infection.",
        ],
        conditionsReplies: [
          "Liam doesn't have any other medical conditions that I know of.",
          "No other health conditions have been diagnosed.",
        ],
        symptomsReplies: [
          "He has the symptoms the doctor assessed, but no breathing trouble or severe reaction.",
          "Nothing new since the doctor saw him, and he is breathing normally.",
        ],
      }),
    ],
    topics: [
      ...commonTopics({
        nameReply: "It's for my son, Liam Henderson.",
        ageReply: "His date of birth is 12 May 2009.",
        allergiesReply: "Liam has no known medicine allergies.",
        medicinesReply: "He isn’t taking any other regular medicines or supplements.",
      }),
      {
        id: "purpose",
        label: "Explain the antibiotic’s purpose",
        category: "clinical_counselling",
        examples: ["Amoxicillin is an antibiotic for Liam’s bacterial infection."],
        fallbackPatterns: ["\\b(?:amoxicillin|antibiotic)\\b.*\\b(?:infection\\w*|bacteria|bacterial|treat\\w*)\\b"],
        requiredPatternGroups: [["\\b(?:infection\\w*|bacteria|bacterial)\\b"]],
        patientReplies: ["Okay, it’s for the infection."],
      },
      {
        id: "directions",
        label: "Explain the exact liquid dose and duration",
        category: "clinical_counselling",
        critical: true,
        examples: ["Give Liam 10 mL three times a day for 10 days."],
        fallbackPatterns: ["\\b(?:10|ten)\\s*ml\\b", "\\bthree times (?:a|per) day\\b|\\btds\\b"],
        requiredPatternGroups: [
          ["\\b(?:10|ten)\\s*ml\\b"],
          ["\\bthree times (?:a|per) day\\b", "\\btds\\b"],
          ["\\b(?:for )?10 days\\b"],
        ],
        forbiddenPatterns: ["\\b(?:5|15|20|five|fifteen|twenty)\\s*ml\\b", "\\b(?:once|twice) daily\\b"],
        patientReplies: ["Ten millilitres three times a day for ten days. Got it."],
      },
      {
        id: "liquid_handling",
        label: "Explain shaking and accurate measurement",
        category: "clinical_counselling",
        critical: true,
        examples: [
          "Shake the bottle well and measure each dose with an oral syringe, not a kitchen spoon.",
          "Use the supplied oral measure and shake well before every dose.",
        ],
        fallbackPatterns: [
          "\\bshake\\b.*\\b(?:bottle|well|dose)\\b",
          "\\b(?:oral syringe|medicine measure|dosing syringe)\\b",
          "\\b(?:not|avoid)\\b.*\\b(?:kitchen|teaspoon|tablespoon)\\b",
        ],
        requiredPatternGroups: [
          ["\\bshake\\b"],
          ["\\b(?:oral syringe|medicine measure|dosing syringe)\\b", "\\b(?:not|avoid)\\b.*\\b(?:kitchen|teaspoon|tablespoon)\\b"],
        ],
        patientReplies: ["I’ll shake it and use the oral syringe for every dose."],
      },
      {
        id: "storage",
        label: "Explain the exact product’s labelled storage",
        category: "clinical_counselling",
        examples: [
          "Follow the storage instructions on this exact bottle and keep it refrigerated as labelled.",
          "Store the mixed medicine in the fridge according to its label.",
        ],
        fallbackPatterns: ["\\b(?:fridge|refrigerat|storage|store)\\w*\\b"],
        patientReplies: ["I’ll keep it where the bottle label says, in the fridge for this product."],
      },
      {
        id: "complete_course",
        label: "Explain course completion",
        category: "clinical_counselling",
        examples: [
          "Complete the full prescribed course even if Liam starts to feel better.",
          "Keep giving it for the full ten days unless a clinician tells you otherwise.",
        ],
        fallbackPatterns: ["\\b(?:complete|finish)\\b.*\\bcourse\\b", "\\bfull (?:ten|10) days\\b"],
        forbiddenPatterns: ["\\b(?:can|should) stop\\b.*\\bfeel(?:s|ing)? better\\b"],
        patientReplies: ["I’ll complete the full course even if Liam improves."],
      },
      {
        id: "common_effects",
        label: "Explain common effects and what to do",
        category: "clinical_counselling",
        examples: [
          "Amoxicillin can cause nausea, diarrhoea or an upset stomach; contact us if you are worried or symptoms are troublesome.",
          "Liam may get mild stomach upset. If it is severe, persistent or you are concerned, seek advice.",
        ],
        fallbackPatterns: [
          "\\b(?:nausea|feel sick|upset stomach|diarrh(?:ea|oea))\\b",
          "\\b(?:side effect|side effects)\\b",
        ],
        requiredPatternGroups: [
          ["\\b(?:nausea|feel sick|upset stomach|diarrh(?:ea|oea)|side effect|side effects)\\b"],
        ],
        patientReplies: [
          "Okay, I’ll watch for stomach upset and ask for help if it is severe or worrying.",
          "Thanks. I’ll contact the pharmacy if the side effects are troublesome.",
        ],
      },
      {
        id: "reaction_safety",
        label: "Provide safety-netting for allergic reactions",
        category: "safety_netting",
        examples: [
          "Seek urgent help if Liam develops facial swelling or difficulty breathing.",
          "Get medical help for a serious rash or allergic reaction.",
        ],
        fallbackPatterns: ["\\b(?:rash|hives|swelling|breathing|allergic reaction|blistering)\\b"],
        requiredPatternGroups: [
          ["\\b(?:rash|hives|swelling|breathing|allergic reaction|blistering)\\b"],
          ["\\b(?:help|urgent|doctor|hospital|emergency|medical attention|medical care|ambulance|000)\\b"],
        ],
        patientReplies: ["I’ll get help if Liam develops signs of a serious reaction."],
      },
      ...closingTopics("I’ll give Liam 10 mL three times daily for 10 days, shaking and measuring it carefully."),
    ],
    unsafeAdviceRules: withCommonUnsafe(
      {
        id: "kitchen_spoon",
        label: "Unsafe liquid measurement advice",
        patterns: ["\\b(?:use|a)\\b.*\\b(?:kitchen|ordinary) (?:tea|table)?spoon\\b.*\\b(?:fine|okay|ok|measure)\\b"],
        detail: "The student recommended an inaccurate household spoon instead of an appropriate oral measuring device.",
      },
      {
        id: "stop_amoxicillin_early",
        label: "Unsafe antibiotic duration advice",
        patterns: ["\\b(?:you can|he can|it is fine to) stop\\b.*\\b(?:feel|feels|feeling) better\\b"],
        detail: "The student advised stopping the antibiotic simply because the child feels better.",
      }
    ),
  },

  "case-4": {
    caseId: "case-4",
    patientRole: "David Park",
    openingMessage: "Hi. Is my sleeping-tablet prescription ready?",
    handoverGoal: "Explain the safety hold respectfully, gather relevant sedative and alcohol history, and give clear next steps.",
    concernAfterTurns: 2,
    concernTopicId: "explain_hold",
    concernPrompt: "Why can’t I just take it home today?",
    patientQuestion: "How long will it take to speak with my doctor?",
    unknownReplies: variedUnknownReplies("I'm not sure what that means for me. Could you explain it plainly?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: [
        "Yes, I've used temazepam before when I couldn't sleep.",
        "Yes. I've had sleeping tablets previously.",
      ],
      conditionsReplies: [
        "I have anxiety and a past history with alcohol that is recorded at the pharmacy.",
        "My anxiety and previous alcohol dependence are the main relevant conditions.",
      ],
      symptomsReplies: [
        "I'm having trouble sleeping, but I don't have chest pain or breathing problems now.",
        "The main problem is sleep. I don't have any urgent symptoms today.",
      ],
    }),
    topics: [
      ...commonTopics({
        nameReply: "David Park. The sleeping tablets are for me.",
        ageReply: "My date of birth is 8 November 1971.",
        allergiesReply: "I don’t have any known medicine allergies.",
        medicinesReply: "I sometimes use other things to help me sleep, but nothing prescribed regularly.",
        medicinesCritical: true,
      }),
      {
        id: "sedative_alcohol_history",
        label: "Ask sensitively about alcohol and other sedatives",
        category: "information_gathering",
        critical: true,
        examples: [
          "To check this is safe, can I ask about alcohol, sleeping medicines or other sedatives you use?",
          "How much alcohol would you usually drink in a week?",
        ],
        fallbackPatterns: [
          "\\b(?:alcohol|drink|drinking)\\b",
          "\\b(?:sleeping tablet|sedative|opioid|benzodiazepine)\\b.*\\b(?:other|use|take)\\b",
        ],
        patientReplies: ["I have a few alcoholic drinks most nights, especially when I can’t sleep."],
      },
      {
        id: "explain_hold",
        label: "Explain that supply is held pending prescriber clarification",
        category: "clinical_counselling",
        critical: true,
        examples: [
          "I can’t safely supply this today until I clarify the dose, quantity and treatment plan with your prescriber.",
          "I need to hold the prescription and contact your doctor before dispensing it.",
        ],
        fallbackPatterns: [
          "\\b(?:hold|cannot supply|can't supply|not supply|before (?:I|we) (?:dispense|supply))\\b",
          "\\b(?:contact|call|clarify|speak)\\w*\\b.*\\b(?:doctor|prescriber)\\b",
        ],
        requiredPatternGroups: [
          ["\\b(?:hold|cannot supply|can't supply|not supply|before (?:I|we) (?:dispense|supply))\\b"],
          ["\\b(?:contact|call|clarify|speak)\\w*\\b"],
          ["\\b(?:doctor|prescriber)\\b"],
        ],
        patientReplies: ["I’m disappointed, but I understand that you need to check with my doctor first."],
      },
      {
        id: "explain_risk",
        label: "Explain sedation and alcohol risk without judgement",
        category: "safety_netting",
        examples: [
          "Temazepam and alcohol can add to sedation and breathing risk, so I need to make sure the plan is safe.",
          "Combining sleeping tablets with alcohol can cause excessive drowsiness and other harm.",
        ],
        fallbackPatterns: ["\\b(?:alcohol|drink)\\b.*\\b(?:temazepam|sleeping tablet|sedation|drows|breathing|risk|unsafe)\\b"],
        requiredPatternGroups: [
          ["\\b(?:alcohol|drink)\\b"],
          ["\\b(?:sedation|drows|breathing|risk|unsafe|harm)\\w*\\b"],
        ],
        patientReplies: ["I didn’t realise the combination could increase the risk that much."],
      },
      {
        id: "next_steps_empathy",
        label: "Use respectful language and give clear next steps",
        category: "communication",
        examples: [
          "I understand this is frustrating. I’ll contact the prescriber, document the outcome and let you know what happens next.",
          "Thank you for discussing this with me; we will update you after speaking with your doctor.",
        ],
        fallbackPatterns: [
          "\\b(?:understand|sorry|frustrating|thank you)\\b",
          "\\b(?:call|contact|update|let you know|next step|follow up)\\b.*\\b(?:doctor|prescriber|you)\\b",
        ],
        requiredPatternGroups: [["\\b(?:call|contact|update|let you know|next step|follow up)\\w*\\b"]],
        patientReplies: ["Thank you for explaining what will happen next."],
      },
      ...closingTopics("You’ll hold the prescription, speak with my doctor and update me before anything is supplied."),
    ],
    unsafeAdviceRules: withCommonUnsafe(
      {
        id: "supply_temazepam_despite_hold",
        label: "Contradictory supply advice",
        patterns: ["\\b(?:i(?:'ll| will)|we can)\\b.*\\b(?:give|supply|dispense)\\b.*\\b(?:today|now|straight away)\\b"],
        detail: "The student told the patient the medicine would be supplied despite the required safety hold.",
      },
      {
        id: "temazepam_alcohol_safe",
        label: "Unsafe alcohol advice",
        patterns: ["\\b(?:alcohol|drink)\\b.*\\b(?:is|are|'s) (?:fine|safe|okay|ok)\\b", "\\byou can drink\\b.*\\b(?:temazepam|sleeping tablet|tonight)\\b"],
        detail: "The student gave unqualified reassurance about combining temazepam with alcohol.",
      }
    ),
  },

  "case-5": {
    caseId: "case-5",
    patientRole: "Carol Simmons",
    openingMessage: "Hello. I’m collecting my metformin prescription.",
    handoverGoal: "Identify the cimetidine and renal-function concerns, explain the hold and provide clear next steps.",
    concernAfterTurns: 2,
    concernTopicId: "explain_hold",
    concernPrompt: "Is there a problem with the prescription?",
    patientQuestion: "Should I keep taking my current tablets while you contact the doctor?",
    unknownReplies: variedUnknownReplies("Could you explain what you need me to do next?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: [
        "Yes, I've taken metformin before, although this is the 1000 milligram strength.",
        "Yes. Metformin is one of my regular diabetes medicines.",
      ],
      conditionsReplies: [
        "I have diabetes, high blood pressure, reflux and mildly reduced kidney function.",
        "My diabetes, blood pressure and recent kidney test are the main relevant issues.",
      ],
      symptomsReplies: [
        "I feel well today and don't have vomiting, severe weakness or breathing trouble.",
        "No new symptoms today; this is a regular prescription.",
      ],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Carol Simmons. Yes, the metformin is for me.",
        ageReply: "My date of birth is 23 April 1959.",
        allergiesReply: "I had an anaphylactic reaction to a sulfonamide antibiotic. I was told to avoid sulfonamides.",
        medicinesReply: "I take cimetidine for reflux as well as my diabetes medicines.",
        medicinesCritical: true,
      }),
      {
        id: "renal_history",
        label: "Ask about renal function, illness and relevant monitoring",
        category: "information_gathering",
        critical: true,
        examples: [
          "Have you had recent kidney-function tests or been told about reduced kidney function?",
          "Have you recently been dehydrated, vomiting or very unwell?",
        ],
        fallbackPatterns: [
          "\\b(?:kidney|renal|egfr)\\b",
          "\\b(?:dehydrat|vomit|diarrhoea|very unwell|acute illness)\\w*\\b",
          "\\b(?:blood test|test results|monitoring)\\b.*\\b(?:kidney|renal)\\b",
        ],
        patientReplies: ["My doctor said my kidney function was a little reduced at my last blood test."],
      },
      {
        id: "explain_hold",
        label: "Explain that supply is held pending prescriber review",
        category: "clinical_counselling",
        critical: true,
        examples: [
          "I need to hold this prescription and contact the prescriber about the cimetidine interaction and kidney function before supply.",
          "I can’t safely complete the supply until the doctor reviews these concerns.",
        ],
        fallbackPatterns: [
          "\\b(?:hold|cannot supply|can't supply|not supply|before (?:I|we) (?:dispense|supply))\\b",
          "\\b(?:contact|call|clarify|speak|review)\\w*\\b.*\\b(?:doctor|prescriber)\\b",
        ],
        requiredPatternGroups: [
          ["\\b(?:hold|cannot supply|can't supply|not supply|before (?:I|we) (?:dispense|supply))\\b"],
          ["\\b(?:contact|call|clarify|speak|review)\\w*\\b"],
          ["\\b(?:doctor|prescriber)\\b"],
        ],
        patientReplies: ["Okay. I understand you need to check before supplying it."],
      },
      {
        id: "explain_concern",
        label: "Explain the interaction and renal concern accurately",
        category: "safety_netting",
        examples: [
          "Cimetidine can increase metformin exposure, and reduced kidney function can increase accumulation risk.",
          "The doctor needs to review the combination of cimetidine, metformin and your kidney results.",
        ],
        fallbackPatterns: [
          "\\bcimetidine\\b.*\\b(?:metformin|interact|increase|combination|review)\\w*\\b",
          "\\b(?:kidney|renal|egfr)\\b.*\\b(?:metformin|accumulat|risk|review|monitor)\\w*\\b",
        ],
        requiredPatternGroups: [
          ["\\bcimetidine\\b"],
          ["\\b(?:kidney|renal|egfr)\\b"],
        ],
        patientReplies: ["I see. I’m glad you checked the combination and my kidney result."],
      },
      {
        id: "next_steps",
        label: "Give safe interim advice and a follow-up plan",
        category: "communication",
        examples: [
          "I’ll contact your prescriber and update you. Do not make changes to your current medicines unless your treating clinician advises it.",
          "We will clarify the plan today and tell you what to do next rather than asking you to stop medicines on your own.",
        ],
        fallbackPatterns: [
          "\\b(?:update|call|contact|follow up|let you know|next step)\\w*\\b",
          "\\b(?:do not|don't) (?:stop|change)\\b.*\\b(?:medicine|tablet|metformin|cimetidine)\\b.*\\b(?:doctor|advice|told)\\b",
        ],
        patientReplies: ["I won’t change anything myself; I’ll wait for the reviewed plan."],
      },
      ...closingTopics("You’ll hold this supply, contact my doctor and update me without me changing the medicines on my own."),
    ],
    unsafeAdviceRules: withCommonUnsafe(
      {
        id: "supply_metformin_despite_hold",
        label: "Contradictory supply advice",
        patterns: ["\\b(?:i(?:'ll| will)|we can)\\b.*\\b(?:give|supply|dispense)\\b.*\\b(?:today|now|straight away)\\b"],
        detail: "The student told the patient the metformin would be supplied despite the required clinical review.",
      },
      {
        id: "abrupt_medicine_change",
        label: "Unsafe unreviewed medicine change",
        patterns: ["\\b(?:stop|cease)\\b.*\\b(?:metformin|cimetidine)\\b.*\\b(?:immediately|right now|today)\\b"],
        detail: "The student directed an immediate medicine change without an appropriate reviewed treatment plan.",
      }
    ),
  },

  "case-6": {
    caseId: "case-6",
    patientRole: "Fiona Chang",
    openingMessage: "Hi. I’m Fiona, and I’m here for the doxycycline prescription.",
    handoverGoal: "Check pregnancy and interacting products, then counsel on safe doxycycline administration.",
    concernAfterTurns: 3,
    concernTopicId: "separation",
    concernPrompt: "I use an antacid most days. Can I take them together?",
    patientQuestion: "Do I need to do anything different when I’m out in the sun?",
    unknownReplies: variedUnknownReplies("Sorry, could you put that another way?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: [
        "No, this is my first time taking doxycycline.",
        "I haven't used this antibiotic before.",
      ],
      conditionsReplies: [
        "I don't have any other medical conditions that I know of.",
        "No other diagnosed health conditions.",
      ],
      symptomsReplies: [
        "I have the symptoms my doctor assessed, but no severe pain or breathing trouble.",
        "Nothing new or urgent since I saw the doctor.",
      ],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Fiona Chang. The doxycycline is for me.",
        ageReply: "My date of birth is 15 March 1998.",
        allergiesReply: "I don’t have any known medicine allergies.",
        medicinesReply: "I use an antacid fairly often and take a multivitamin.",
        medicinesCritical: true,
      }),
      {
        id: "pregnancy_check",
        label: "Check pregnancy and breastfeeding status sensitively",
        category: "information_gathering",
        critical: true,
        examples: [
          "Before we continue, is there any chance you are pregnant or are you breastfeeding?",
          "Can I check whether you are pregnant, planning pregnancy or breastfeeding?",
        ],
        fallbackPatterns: ["\\b(?:pregnan|breastfeed|breast feeding|trying for a baby|planning pregnancy)\\w*\\b"],
        patientReplies: ["No, I’m not pregnant or breastfeeding."],
      },
      {
        id: "directions",
        label: "Explain the correct doxycycline dose and frequency",
        category: "clinical_counselling",
        critical: true,
        examples: ["Take one tablet twice a day as prescribed."],
        fallbackPatterns: ["\\b(?:take|use)\\b.*\\b(?:doxycycline|tablet)\\b", "\\b(?:twice (?:a|per) day|bd)\\b"],
        requiredPatternGroups: [
          ["\\b(?:one|1)\\b"],
          ["\\b(?:twice (?:a|per) day|bd)\\b"],
        ],
        forbiddenPatterns: ["\\b(?:two|2) tablets?\\b", "\\b(?:once|three times) daily\\b"],
        patientReplies: ["One tablet twice a day. Okay."],
      },
      {
        id: "water_upright",
        label: "Explain water and upright administration",
        category: "clinical_counselling",
        critical: true,
        examples: [
          "Take it with a full glass of water and stay upright for at least 30 minutes.",
          "Do not lie down for 30 minutes after taking doxycycline.",
        ],
        fallbackPatterns: [
          "\\bfull glass of water\\b",
          "\\b(?:stay|remain|keep) upright\\b.*\\b30 (?:minutes?|mins?)\\b",
          "\\b(?:do not|don't|avoid) lie down\\b.*\\b30 (?:minutes?|mins?)\\b",
        ],
        requiredPatternGroups: [
          ["\\b(?:full )?glass of water\\b"],
          ["\\bupright\\b.*\\b30 (?:minutes?|mins?)\\b", "\\b(?:do not|don't|avoid) lie down\\b.*\\b30 (?:minutes?|mins?)\\b"],
        ],
        patientReplies: ["I’ll use a full glass of water and stay upright for half an hour."],
      },
      {
        id: "separation",
        label: "Explain separation from interacting products",
        category: "safety_netting",
        critical: true,
        examples: [
          "Separate antacids, iron, calcium, multivitamins and dairy from doxycycline by at least two hours.",
          "Do not take the antacid at the same time; leave a two-hour gap.",
        ],
        fallbackPatterns: [
          "\\b(?:antacid|iron|calcium|dairy|multivitamin)\\b.*\\b(?:two|2) hours?\\b",
          "\\b(?:two|2) hours?\\b.*\\b(?:antacid|iron|calcium|dairy|multivitamin)\\b",
          "\\bseparat\\w*\\b.*\\b(?:antacid|iron|calcium|dairy|multivitamin)\\b",
        ],
        requiredPatternGroups: [
          ["\\b(?:antacid|iron|calcium|dairy|multivitamin)\\b"],
          ["\\b(?:two|2) hours?\\b", "\\bseparat\\w*\\b"],
        ],
        patientReplies: ["I’ll leave at least two hours between doxycycline and my antacid or multivitamin."],
      },
      {
        id: "sun_precautions",
        label: "Explain photosensitivity and sun protection",
        category: "safety_netting",
        examples: [
          "Doxycycline can make you more sensitive to sunlight, so use sunscreen and protective clothing.",
          "Be careful in the sun and use effective sun protection.",
        ],
        fallbackPatterns: ["\\b(?:sun|sunlight|sunscreen|photosensit|protective clothing)\\w*\\b"],
        requiredPatternGroups: [["\\b(?:sun|sunlight|sunscreen|photosensit|protective clothing)\\w*\\b"]],
        patientReplies: ["I’ll use sunscreen and cover up while I’m taking it."],
      },
      ...closingTopics("I’ll take one tablet twice daily with water, stay upright, separate my antacid and protect myself from the sun."),
    ],
    unsafeAdviceRules: withCommonUnsafe(
      {
        id: "doxy_lie_down",
        label: "Unsafe administration advice",
        patterns: ["\\b(?:it is|it's|that is|that's) (?:fine|safe|okay|ok)\\b.*\\blie down\\b", "\\byou can lie down\\b.*\\b(?:straight away|immediately|after)\\b"],
        detail: "The student advised lying down immediately after doxycycline, increasing oesophageal injury risk.",
      },
      {
        id: "doxy_same_time_antacid",
        label: "Unsafe interaction advice",
        patterns: ["\\b(?:antacid|iron|calcium|multivitamin)\\b.*\\b(?:same time|together)\\b.*\\b(?:fine|safe|okay|ok)\\b"],
        detail: "The student advised taking an interacting product at the same time as doxycycline.",
      }
    ),
  },
  "case-7": {
    caseId: "case-7",
    patientRole: "Peter Morales",
    openingMessage: "Hello. I’m here for my regular OxyContin prescription.",
    handoverGoal: "Confirm opioid tolerance and give complete modified-release opioid safety counselling.",
    concernAfterTurns: 3,
    concernTopicId: "secure_storage",
    concernPrompt: "My grandchildren visit on weekends. Where should I keep these tablets?",
    patientQuestion: "What would mean I need urgent help?",
    unknownReplies: variedUnknownReplies("Could you explain how that affects my OxyContin?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: ["I have used this exact 20 milligram OxyContin twice daily for about six months."],
      conditionsReplies: ["I have metastatic prostate cancer and chronic pain."],
      symptomsReplies: ["My pain is currently controlled. I am awake, breathing normally and not unusually drowsy."],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Peter Morales. The OxyContin is for me.",
        ageReply: "My date of birth is 19 August 1963.",
        allergiesReply: "I have no known medicine allergies.",
        medicinesReply: "I use short-acting oxycodone for breakthrough pain and a prescribed laxative.",
        medicinesCritical: true,
      }),
      {
        id: "opioid_tolerance",
        label: "Confirm current opioid exposure and response",
        category: "information_gathering",
        critical: true,
        examples: ["How long have you taken this dose, and has it caused excessive sleepiness or breathing problems?"],
        fallbackPatterns: ["\\b(?:how long|regular|current)\\b.*\\b(?:oxycontin|oxycodone|opioid|dose)\\b", "\\b(?:drows|sleep|breath)\\w*\\b.*\\b(?:opioid|oxycodone|oxycontin)\\b"],
        patientReplies: ["I have taken 20 milligrams every 12 hours for six months without breathing problems or excessive sleepiness."],
      },
      {
        id: "directions_mr",
        label: "Explain exact dose and modified-release administration",
        category: "clinical_counselling",
        critical: true,
        examples: ["Take one 20 milligram tablet every 12 hours and swallow it whole; do not crush or chew it."],
        fallbackPatterns: ["\\b(?:one|1)\\b.*\\b(?:20 ?mg|20 milligram)\\b.*\\b(?:12 hours|twice)\\b", "\\bswallow\\b.*\\bwhole\\b.*\\b(?:not|never|do not|don't)\\b.*\\b(?:crush|chew)\\b"],
        requiredPatternGroups: [["\\b(?:every 12 hours|twice (?:a|per) day|bd)\\b"], ["\\bswallow\\b.*\\bwhole\\b"], ["\\b(?:do not|don't|never)\\b.*\\b(?:crush|chew)\\b"]],
        patientReplies: ["One tablet every 12 hours, swallowed whole. I won’t crush or chew it."],
      },
      {
        id: "sedation_safety",
        label: "Counsel on sedation, alcohol and driving",
        category: "safety_netting",
        examples: ["Avoid alcohol, and do not drive if you feel drowsy or impaired."],
        fallbackPatterns: ["\\b(?:drows|sleep|sedat|impair)\\w*\\b", "\\b(?:avoid|no|do not|don't)\\b.*\\balcohol\\b", "\\b(?:drive|driving|machinery)\\b"],
        patientReplies: ["I’ll avoid alcohol and won’t drive if I am drowsy or impaired."],
      },
      {
        id: "secure_storage",
        label: "Explain secure storage and safe disposal",
        category: "clinical_counselling",
        critical: true,
        examples: ["Keep it locked away from children and visitors, never share it, and return unwanted tablets to a pharmacy."],
        fallbackPatterns: ["\\b(?:lock|locked|secure|out of reach)\\w*\\b", "\\b(?:never|do not|don't) share\\b", "\\breturn\\b.*\\bpharmacy\\b"],
        patientReplies: ["I’ll keep it locked away, never share it and return leftovers to the pharmacy."],
      },
      {
        id: "respiratory_red_flags",
        label: "Provide opioid overdose safety-netting",
        category: "safety_netting",
        critical: true,
        examples: ["Call 000 for very slow or difficult breathing, blue lips, collapse or if you cannot be woken."],
        fallbackPatterns: ["\\b(?:000|emergency|ambulance|urgent)\\b.*\\b(?:breath|blue|wake|unresponsive|collapse)\\w*\\b"],
        patientReplies: ["I’ll call 000 if breathing becomes slow or difficult or if I cannot be woken."],
      },
      ...closingTopics("I’ll take one whole tablet every 12 hours, avoid alcohol and unsafe driving, lock it away and seek emergency help for breathing trouble or unresponsiveness."),
    ],
    unsafeAdviceRules: withCommonUnsafe({
      id: "crush_oxycontin",
      label: "Unsafe modified-release manipulation",
      patterns: ["\\b(?:crush|chew|split)\\b.*\\b(?:oxycontin|tablet)\\b.*\\b(?:fine|okay|safe|can)\\b"],
      detail: "The student advised manipulating a modified-release oxycodone tablet.",
    }),
  },
  "case-8": {
    caseId: "case-8",
    patientRole: "Helen Brooks",
    openingMessage: "Hello. The doctor has prescribed a pain patch for me.",
    handoverGoal: "Identify opioid-naive status, explain the unsafe fentanyl order and arrange prescriber review.",
    concernAfterTurns: 2,
    concernTopicId: "explain_hold",
    concernPrompt: "Why can’t I take the patch home now?",
    patientQuestion: "What should I use for pain while you contact the doctor?",
    unknownReplies: variedUnknownReplies("I’m not sure what you need to know about my pain medicines."),
    responseIntents: commonResponseIntents({
      previousUseReplies: ["I have never used fentanyl, oxycodone, morphine or any other strong opioid."],
      conditionsReplies: ["I have osteoarthritis and live alone."],
      symptomsReplies: ["I am sore but alert and breathing normally."],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Helen Brooks. The patch is for me.",
        ageReply: "My date of birth is 4 February 1945.",
        allergiesReply: "I have no known medicine allergies.",
        medicinesReply: "I only use paracetamol for pain. I do not take sleeping tablets or strong pain medicines.",
        medicinesCritical: true,
      }),
      {
        id: "opioid_history",
        label: "Establish opioid exposure and sedative use",
        category: "information_gathering",
        critical: true,
        examples: ["Have you used fentanyl or another strong opioid regularly before?"],
        fallbackPatterns: ["\\b(?:fentanyl|opioid|morphine|oxycodone|strong pain)\\b.*\\b(?:before|regular|currently|take|use)\\w*\\b"],
        patientReplies: ["No. I have never taken a strong opioid regularly; I use paracetamol."],
      },
      {
        id: "explain_hold",
        label: "Explain that fentanyl supply must be held",
        category: "clinical_counselling",
        critical: true,
        examples: ["I cannot supply this patch until I urgently clarify it with your prescriber because it is unsafe for someone who is not opioid-tolerant."],
        fallbackPatterns: ["\\b(?:cannot|can't|hold|not)\\b.*\\b(?:supply|dispense|give)\\b", "\\b(?:contact|call|clarify|speak)\\w*\\b.*\\b(?:doctor|prescriber)\\b"],
        requiredPatternGroups: [["\\b(?:cannot|can't|hold|not supply|not dispense)\\b"], ["\\b(?:doctor|prescriber)\\b"]],
        patientReplies: ["All right. I understand you need to stop and contact the doctor first."],
      },
      {
        id: "explain_risk",
        label: "Explain the respiratory-depression risk",
        category: "safety_netting",
        critical: true,
        examples: ["This strength can dangerously slow breathing in a person who is not already tolerant to opioids."],
        fallbackPatterns: ["\\b(?:slow|stop|depress|danger)\\w*\\b.*\\bbreath\\w*\\b", "\\b(?:not opioid tolerant|opioid naive|not used)\\b"],
        patientReplies: ["I see—the patch could dangerously slow my breathing because I’m not used to opioids."],
      },
      {
        id: "interim_plan",
        label: "Give a safe interim plan without improvising treatment",
        category: "communication",
        examples: ["Keep using only the treatment already agreed with your clinician; I will contact the prescriber and update you rather than starting this patch."],
        fallbackPatterns: ["\\b(?:contact|call|update|let you know)\\b", "\\b(?:do not|don't)\\b.*\\b(?:start|apply|use)\\b.*\\bpatch\\b"],
        patientReplies: ["I won’t apply a patch. I’ll wait for the doctor’s reviewed plan."],
      },
      ...closingTopics("You will hold the fentanyl patch, contact my doctor and update me. I will not apply it."),
    ],
    unsafeAdviceRules: withCommonUnsafe({
      id: "supply_fentanyl_naive",
      label: "Unsafe fentanyl supply advice",
      patterns: ["\\b(?:apply|use|start)\\b.*\\bpatch\\b.*\\b(?:today|now|when you get home)\\b"],
      detail: "The student advised an opioid-naive patient to start the fentanyl patch.",
    }),
  },
  "case-9": {
    caseId: "case-9",
    patientRole: "Noah Williams’s parent",
    openingMessage: "Hi. I’m collecting Noah’s usual dexamfetamine.",
    handoverGoal: "Explain the prescription-authentication hold and provide a clear follow-up plan.",
    concernAfterTurns: 2,
    concernTopicId: "explain_hold",
    concernPrompt: "It looks like his usual medicine. Why is there a delay?",
    patientQuestion: "Will you call the clinic using the number on the prescription?",
    unknownReplies: variedUnknownReplies("Could you explain what detail on the prescription is concerning?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: ["Noah has used dexamfetamine for several months."],
      conditionsReplies: ["He has ADHD and no known heart condition."],
      symptomsReplies: ["He is well today with no chest pain, fainting or severe agitation."],
    }),
    topics: [
      ...commonTopics({
        nameReply: "It is for my son, Noah Williams.",
        ageReply: "His date of birth is 11 November 2009.",
        allergiesReply: "Noah has no known medicine allergies.",
        medicinesReply: "He takes dexamfetamine only; no decongestants, antidepressants or supplements.",
        medicinesCritical: true,
      }),
      {
        id: "explain_hold",
        label: "Explain the Schedule 8 authentication hold",
        category: "clinical_counselling",
        critical: true,
        examples: ["The printed prescriber number does not match the verified directory, so I must hold the Schedule 8 prescription and authenticate it."],
        fallbackPatterns: ["\\bprescriber (?:number|details)\\b.*\\b(?:not match|mismatch|different|incorrect)\\b", "\\b(?:hold|cannot supply|authenticate|verify)\\w*\\b.*\\b(?:prescription|schedule 8|s8)\\b"],
        requiredPatternGroups: [["\\b(?:prescriber|doctor)\\b.*\\b(?:number|details)\\b"], ["\\b(?:hold|authenticate|verify|contact)\\w*\\b"]],
        patientReplies: ["I understand—the prescriber number does not match, so you need to authenticate it first."],
      },
      {
        id: "independent_contact",
        label: "Use independently verified prescriber contact details",
        category: "safety_netting",
        critical: true,
        examples: ["I will contact the clinic using our established directory, not a number written on the questionable prescription."],
        fallbackPatterns: ["\\b(?:directory|verified|established|independent)\\w*\\b.*\\b(?:phone|number|contact|clinic)\\b", "\\b(?:not|won't|will not)\\b.*\\bnumber\\b.*\\bprescription\\b"],
        patientReplies: ["That makes sense. Please use the clinic details you already have verified."],
      },
      {
        id: "follow_up",
        label: "Give a documented follow-up plan",
        category: "communication",
        examples: ["I will document the call and update you once the prescriber confirms or replaces the prescription."],
        fallbackPatterns: ["\\b(?:document|record)\\w*\\b.*\\b(?:call|contact|outcome)\\b", "\\b(?:update|call|let you know)\\b"],
        patientReplies: ["Please update me after the clinic confirms what happened."],
      },
      ...closingTopics("You will hold the medicine, contact the clinic through the verified directory, document it and update me."),
    ],
    unsafeAdviceRules: withCommonUnsafe({
      id: "call_unverified_number",
      label: "Unsafe prescription authentication",
      patterns: ["\\bcall\\b.*\\bnumber\\b.*\\b(?:on|written on)\\b.*\\bprescription\\b"],
      detail: "The student proposed authenticating a suspicious S8 prescription through an unverified number on that prescription.",
    }),
  },
  "case-10": {
    caseId: "case-10",
    patientRole: "Grace Lim",
    openingMessage: "Hello. I’m collecting my methotrexate.",
    handoverGoal: "Identify the daily-dose error, hold supply and explain the safe next step.",
    concernAfterTurns: 2,
    concernTopicId: "explain_hold",
    concernPrompt: "The label says daily, but I thought I took it once a week. Which is right?",
    patientQuestion: "Should I take today’s tablet while you check?",
    unknownReplies: variedUnknownReplies("Could you explain what you are checking about my weekly medicine?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: ["I have taken 10 milligrams every Sunday for rheumatoid arthritis."],
      conditionsReplies: ["I have rheumatoid arthritis."],
      symptomsReplies: ["I feel well, with no fever, mouth ulcers, unusual bruising or shortness of breath."],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Grace Lim. The methotrexate is for me.",
        ageReply: "My date of birth is 9 September 1967.",
        allergiesReply: "I have no known medicine allergies.",
        medicinesReply: "I take folic acid on a different day and sometimes paracetamol. I do not use ibuprofen unless advised.",
        medicinesCritical: true,
      }),
      {
        id: "weekly_history",
        label: "Confirm the established weekly regimen and folate plan",
        category: "information_gathering",
        critical: true,
        examples: ["What day do you normally take methotrexate, and when do you take folic acid?"],
        fallbackPatterns: ["\\b(?:what|which) day\\b.*\\bmethotrexate\\b", "\\bfolic acid\\b.*\\b(?:day|take|when)\\b"],
        patientReplies: ["I take methotrexate every Sunday and folic acid on Monday."],
      },
      {
        id: "explain_hold",
        label: "Explain the critical daily-dose error and hold",
        category: "clinical_counselling",
        critical: true,
        examples: ["Daily low-dose methotrexate can be fatal. I will not supply this until the prescriber confirms corrected weekly directions."],
        fallbackPatterns: ["\\bdaily\\b.*\\bmethotrexate\\b.*\\b(?:danger|toxic|fatal|wrong|error)\\w*\\b", "\\b(?:hold|cannot|can't|not)\\b.*\\b(?:supply|dispense)\\b.*\\b(?:doctor|prescriber|confirm|clarify)\\b"],
        requiredPatternGroups: [["\\bdaily\\b"], ["\\b(?:danger|toxic|fatal|error|incorrect|wrong)\\w*\\b"], ["\\b(?:hold|contact|confirm|clarify)\\w*\\b"]],
        patientReplies: ["I won’t follow the daily direction. Please have the doctor correct it before supply."],
      },
      {
        id: "red_flags",
        label: "Check and explain methotrexate toxicity red flags",
        category: "safety_netting",
        examples: ["Seek urgent advice for fever, mouth ulcers, unusual bruising or bleeding, severe rash or shortness of breath."],
        fallbackPatterns: ["\\b(?:fever|mouth ulcers?|bruis|bleed|shortness of breath|severe rash)\\w*\\b"],
        patientReplies: ["I’ll seek urgent advice for fever, mouth ulcers, unusual bruising or breathing trouble."],
      },
      ...closingTopics("I will not take a daily dose. You will hold the prescription and have the doctor confirm a corrected once-weekly plan."),
    ],
    unsafeAdviceRules: withCommonUnsafe({
      id: "daily_methotrexate",
      label: "Unsafe daily methotrexate advice",
      patterns: ["\\b(?:take|use)\\b.*\\bmethotrexate\\b.*\\b(?:daily|every day)\\b"],
      detail: "The student endorsed the dangerous daily methotrexate direction.",
    }),
  },
  "case-11": {
    caseId: "case-11",
    patientRole: "Rahul Mehta",
    openingMessage: "Hi. I need my lithium, but I’ve had a stomach bug for two days.",
    handoverGoal: "Recognise possible lithium toxicity risk and arrange urgent clinical assessment.",
    concernAfterTurns: 2,
    concernTopicId: "urgent_plan",
    concernPrompt: "My hands are shakier and I feel unsteady. Is that just the stomach bug?",
    patientQuestion: "Can I keep taking lithium and ibuprofen tonight?",
    unknownReplies: variedUnknownReplies("Could you explain what that has to do with dehydration or lithium?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: ["I have taken Quilonum SR for several years."],
      conditionsReplies: ["I have bipolar disorder and no known chronic kidney disease."],
      symptomsReplies: ["I have vomiting, diarrhoea, poor fluid intake, a worse tremor and feel unsteady."],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Rahul Mehta. The lithium is for me.",
        ageReply: "My date of birth is 29 January 1982.",
        allergiesReply: "I have no known medicine allergies.",
        medicinesReply: "I started ibuprofen for aches during the stomach bug. I also take lithium regularly.",
        medicinesCritical: true,
      }),
      {
        id: "toxicity_assessment",
        label: "Assess illness, hydration, NSAID use and lithium toxicity symptoms",
        category: "information_gathering",
        critical: true,
        examples: ["Have you been vomiting or dehydrated, taken ibuprofen, or developed worsening tremor, unsteadiness or confusion?"],
        fallbackPatterns: ["\\b(?:vomit|diarrh|dehydrat|fluid|drink)\\w*\\b", "\\b(?:ibuprofen|nsaid|naproxen)\\b", "\\b(?:tremor|shak|unsteady|ataxia|confus)\\w*\\b"],
        requiredPatternGroups: [["\\b(?:vomit|diarrh|dehydrat|fluid|drink)\\w*\\b"], ["\\b(?:ibuprofen|nsaid|naproxen)\\b"]],
        patientReplies: ["Yes—vomiting and diarrhoea, hardly drinking, ibuprofen, a worse tremor and some unsteadiness."],
      },
      {
        id: "urgent_plan",
        label: "Hold routine supply and arrange urgent clinical assessment",
        category: "safety_netting",
        critical: true,
        examples: ["These symptoms could be lithium toxicity. Do not self-manage this as a routine refill; you need urgent medical assessment now."],
        fallbackPatterns: ["\\blithium toxicity\\b", "\\b(?:urgent|immediate|today|now)\\b.*\\b(?:assessment|medical|doctor|emergency)\\b"],
        requiredPatternGroups: [["\\blithium\\b.*\\btoxic\\w*\\b"], ["\\b(?:urgent|immediate|today|now)\\b"]],
        patientReplies: ["I understand this could be lithium toxicity and I need urgent assessment now."],
      },
      {
        id: "interaction_explanation",
        label: "Explain dehydration and NSAID interaction risk",
        category: "clinical_counselling",
        examples: ["Dehydration and ibuprofen can raise lithium levels and increase toxicity risk."],
        fallbackPatterns: ["\\b(?:dehydrat|vomit|diarrh)\\w*\\b.*\\blithium\\b", "\\b(?:ibuprofen|nsaid)\\b.*\\blithium\\b.*\\b(?:increase|raise|toxic|level)\\w*\\b"],
        patientReplies: ["I see—both dehydration and ibuprofen may have raised my lithium level."],
      },
      ...closingTopics("I will seek urgent assessment now because the illness, ibuprofen and symptoms could mean lithium toxicity."),
    ],
    unsafeAdviceRules: withCommonUnsafe({
      id: "routine_lithium_continue",
      label: "Unsafe routine continuation advice",
      patterns: ["\\b(?:keep|continue) taking\\b.*\\blithium\\b.*\\b(?:as normal|as usual|tonight)\\b"],
      detail: "The student advised routine lithium continuation despite possible toxicity requiring urgent assessment.",
    }),
  },
  "case-12": {
    caseId: "case-12",
    patientRole: "Evelyn Scott",
    openingMessage: "Hello. I’m collecting my Eliquis. The tablet looks stronger this time.",
    handoverGoal: "Identify the indication-specific dose and NSAID bleeding-risk concerns and hold for review.",
    concernAfterTurns: 2,
    concernTopicId: "explain_hold",
    concernPrompt: "My old box was 2.5 milligrams. Why does this prescription say 5 milligrams?",
    patientQuestion: "I use naproxen for arthritis. Can I keep taking it with Eliquis?",
    unknownReplies: variedUnknownReplies("Could you explain what information you need about my blood thinner?"),
    responseIntents: commonResponseIntents({
      previousUseReplies: ["I have been taking Eliquis 2.5 milligrams twice daily for atrial fibrillation."],
      conditionsReplies: ["I have atrial fibrillation and reduced kidney function."],
      symptomsReplies: ["I have some easy bruising but no major bleeding, black stools, severe headache or weakness."],
    }),
    topics: [
      ...commonTopics({
        nameReply: "Evelyn Scott. The Eliquis is for me.",
        ageReply: "My date of birth is 2 December 1942. I am 83.",
        allergiesReply: "I have no known medicine allergies.",
        medicinesReply: "I use naproxen most days for arthritis and take my other heart medicines.",
        medicinesCritical: true,
      }),
      {
        id: "dose_factors",
        label: "Check indication, prior dose, weight and renal function",
        category: "information_gathering",
        critical: true,
        examples: ["Is this for atrial fibrillation, what dose did you use before, and do you know your weight and kidney results?"],
        fallbackPatterns: ["\\b(?:atrial fibrillation|af)\\b", "\\b(?:weight|kidney|renal|creatinine|egfr)\\b", "\\b(?:old|previous|before|usual) dose\\b"],
        requiredPatternGroups: [["\\b(?:indication|atrial fibrillation|af|what.*for)\\b"], ["\\b(?:weight|kidney|renal|creatinine|egfr|age)\\b"]],
        patientReplies: ["It is for atrial fibrillation. I weigh 54 kilograms, my creatinine was 168, and my previous dose was 2.5 milligrams twice daily."],
      },
      {
        id: "explain_hold",
        label: "Explain the dose discrepancy and hold for review",
        category: "clinical_counselling",
        critical: true,
        examples: ["Your age, weight and renal result may require the lower atrial-fibrillation dose, so I must hold this 5 milligram prescription and contact the prescriber."],
        fallbackPatterns: ["\\b(?:age|weight|kidney|renal|creatinine)\\b.*\\b(?:dose|2\\.5|lower|reduce)\\b", "\\b(?:hold|contact|call|clarify|review)\\w*\\b.*\\b(?:doctor|prescriber)\\b"],
        requiredPatternGroups: [["\\b(?:dose|strength)\\b"], ["\\b(?:contact|call|clarify|review|hold)\\w*\\b"]],
        patientReplies: ["Please check it. I won’t switch to the stronger tablet until the doctor reviews the dose."],
      },
      {
        id: "bleeding_interaction",
        label: "Explain NSAID interaction and bleeding red flags",
        category: "safety_netting",
        critical: true,
        examples: ["Naproxen can increase bleeding with apixaban. Seek urgent help for uncontrolled bleeding, black stools, blood in urine, collapse or sudden severe headache."],
        fallbackPatterns: ["\\bnaproxen\\b.*\\b(?:bleed|risk|apixaban|eliquis|avoid|review)\\w*\\b", "\\b(?:black stools?|blood in urine|uncontrolled bleeding|severe headache|collapse)\\b"],
        patientReplies: ["I’ll have the naproxen reviewed and seek urgent help for major bleeding, black stools or a sudden severe headache."],
      },
      ...closingTopics("You will hold the 5 milligram Eliquis, check the atrial-fibrillation dose and naproxen with my doctor, then update me."),
    ],
    unsafeAdviceRules: withCommonUnsafe({
      id: "start_high_apixaban",
      label: "Unsafe unreviewed apixaban dose advice",
      patterns: ["\\b(?:start|take|use)\\b.*\\b(?:5 ?mg|5 milligram)\\b.*\\b(?:today|now|tonight|as written)\\b"],
      detail: "The student advised starting the unresolved higher apixaban dose.",
    }),
  },
};

export function getConversationCase(caseId: string): ConversationCase {
  const conversation = CONVERSATION_CASES[caseId];
  if (!conversation) {
    throw new Error(`Missing conversation configuration for ${caseId}`);
  }
  return conversation;
}
