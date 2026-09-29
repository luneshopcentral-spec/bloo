import type { PhrasingBank } from "./phrasings";

/**
 * Held-out wordings, never used to tune the matching rules or as examples for
 * the nearest-wording matcher. They measure how understanding generalises to
 * wording nobody prepared for — the number that matters for real students.
 * This round mixes every style so far (casual, formal, text-speak, passive,
 * hedged) in new sentences.
 *
 * When a round has been used to find and fix gaps it is no longer unseen:
 * move its lines into phrasings.ts (see its header) and write a fresh round.
 */
export const HELD_OUT_SHARED: PhrasingBank = {
  says: {
    introduction: [
      "Hi, thanks for waiting, I'm Mia and I'm the pharmacist today.",
      "Good morning, I'm a pharmacist here and I'll be helping you with your prescription.",
    ],
    confirm_identity: [
      "First up, can you tell me your full name?",
      "whats ur full name",
    ],
    confirm_age: [
      "What's your birthday?",
      "Could you confirm the date of birth for me please?",
    ],
    allergies: [
      "Are you allergic to anything that I should know about?",
      "any reactions to medicines in the past?",
    ],
    current_medicines: [
      "Is there anything else you're taking, including over the counter stuff?",
      "What medicines do you normally take every day?",
    ],
    teach_back: [
      "Can you tell me in your own words how you'll take this?",
      "So just to check, how are you going to use this medicine?",
    ],
    invite_questions: [
      "Anything else you'd like to ask me today?",
      "Do you have any other questions?",
    ],
  },
};

export const HELD_OUT_CASES: Record<string, PhrasingBank> = {
  "case-1": {
    says: {
      purpose: ["It's erythromycin, an antibiotic to treat your infection."],
      explain_hold: [
        "You had this dispensed just four days ago, so it's too early, and I can't supply it until I've spoken to your doctor.",
        "i need to hold this because its too early for the repeat, ill check with ur doctor first",
      ],
      next_steps: ["After I've spoken to the doctor, I'll give you a call to let you know."],
      allergic_reaction_safety: ["If you notice swelling or have trouble breathing, get emergency help straight away."],
    },
  },
  "case-2": {
    says: {
      dose_plan: ["Take your warfarin as directed by the anticoagulation clinic."],
      inr_monitoring: ["You'll need to keep having your INR blood tests."],
      interactions: ["Avoid anti-inflammatories like ibuprofen, they can increase bleeding with warfarin."],
      bleeding_safety: ["If you have bleeding that won't stop, get urgent medical help."],
    },
  },
  "case-3": {
    says: {
      purpose: ["The antibiotic will help treat Liam's infection."],
      directions: ["He needs 10 mL three times a day for ten days."],
      liquid_handling: ["Shake the bottle before each dose and measure it with the oral syringe."],
      storage: ["Once it's made up, keep it in the fridge."],
      complete_course: ["Make sure he finishes the full course."],
      common_effects: ["It can cause diarrhoea or an upset stomach."],
      reaction_safety: ["If he gets a rash or swelling, get medical help."],
    },
  },
  "case-4": {
    says: {
      sedative_alcohol_history: ["How often do you drink alcohol?"],
      explain_hold: ["I can't supply this today until I've clarified it with your doctor."],
      explain_risk: ["Alcohol with temazepam can cause dangerous drowsiness."],
      next_steps_empathy: ["I'll contact your doctor and let you know what happens next."],
    },
  },
  "case-5": {
    says: {
      renal_history: ["Have you had your kidneys checked recently?"],
      explain_hold: ["I need to hold this prescription until I've spoken to your doctor."],
      explain_concern: ["Cimetidine can increase metformin levels, which is a problem with your kidney function."],
      next_steps: ["I'll contact your doctor and update you, so please don't change anything yourself."],
    },
  },
  "case-6": {
    says: {
      pregnancy_check: ["Is there a chance you might be pregnant?"],
      directions: ["Take one tablet twice a day."],
      water_upright: ["Take it with a full glass of water and don't lie down for 30 minutes."],
      separation: ["Take it two hours apart from your antacid."],
      sun_precautions: ["Use sunscreen, as it can make your skin more sensitive to the sun."],
    },
  },
  "case-7": {
    says: {
      opioid_tolerance: ["How long have you been taking OxyContin at this dose?"],
      directions_mr: ["Take one tablet every 12 hours and don't crush or chew it."],
      sedation_safety: ["Don't drink alcohol with this, and don't drive if you feel drowsy."],
      secure_storage: ["Keep them locked away and out of reach of children."],
      respiratory_red_flags: ["Call 000 if you have trouble breathing or become very drowsy."],
    },
  },
  "case-8": {
    says: {
      opioid_history: ["Have you ever used opioids like oxycodone or morphine?"],
      explain_hold: ["I can't give you this patch until I've spoken to your doctor."],
      explain_risk: ["Because you're not used to opioids, this patch could slow your breathing."],
      interim_plan: ["Please keep using your usual pain relief until I've spoken to the doctor."],
    },
  },
  "case-9": {
    says: {
      explain_hold: ["The prescriber number doesn't match, so I have to hold this and verify it."],
      independent_contact: ["I'll contact the clinic using the details we have on file."],
      follow_up: ["I'll let you know what the clinic says."],
    },
  },
  "case-10": {
    says: {
      weekly_history: ["What day of the week do you usually take it?"],
      explain_hold: ["This says daily but it should be weekly, so I'll hold it and check with your doctor."],
      red_flags: ["If you get a fever or mouth ulcers, see a doctor urgently."],
    },
  },
  "case-11": {
    says: {
      toxicity_assessment: ["Have you been vomiting, and have you taken any ibuprofen?"],
      urgent_plan: ["You need to go to the doctor urgently today."],
      interaction_explanation: ["Dehydration and ibuprofen can raise your lithium level."],
    },
  },
  "case-12": {
    says: {
      dose_factors: ["What's it for, and do you know your weight?"],
      explain_hold: ["The dose is higher than before, so I'll hold it and check with your doctor."],
      bleeding_interaction: ["Naproxen can increase bleeding when taken with Eliquis."],
    },
  },
  "case-13": {
    says: {
      two_item_orientation: ["You've got two different medicines today."],
      metformin_xr_admin: ["Swallow the metformin tablets whole."],
      metformin_gi_advice: ["Take the metformin with meals."],
      sitagliptin_dose: ["Take one sitagliptin tablet daily."],
      hypo_advice: ["These don't usually cause hypos, but if you feel shaky, have some sugar."],
      diabetes_red_flags: ["If you get severe stomach pain, get urgent help."],
    },
  },
};
