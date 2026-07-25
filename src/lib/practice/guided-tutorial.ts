export const GUIDED_TUTORIAL_OPENING_MESSAGE =
  "Hello, I am the pharmacist looking after you today. Could I confirm your full name? What is your date of birth? Do you have any medicine allergies?";

export const GUIDED_TUTORIAL_EXPLANATION_MESSAGE =
  "What other medicines do you take, including vitamins or supplements? This erythromycin is an antibiotic for your infection. The repeat is too early, so I cannot supply it today. I will contact your prescriber and update you before it can be given. If the prescriber confirms it, take one capsule three times a day. Finish the full course even if you feel better.";

export const GUIDED_TUTORIAL_SAFETY_MESSAGE =
  "If it causes nausea, take it with food or milk. If you develop facial swelling or difficulty breathing, seek urgent help. Can you repeat the plan back to me in your own words? What questions do you have?";

function normaliseTutorialMessage(message: string): string {
  return message.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchesGuidedOpeningMessage(message: string): boolean {
  const value = normaliseTutorialMessage(message);
  return value.includes("pharmacist")
    && value.includes("name")
    && (value.includes("date of birth") || value.includes("dob"))
    && value.includes("allerg");
}

export function matchesGuidedExplanationMessage(message: string): boolean {
  const value = normaliseTutorialMessage(message);
  return (value.includes("erythromycin") || value.includes("antibiotic"))
    && value.includes("infection")
    && (value.includes("medicine") || value.includes("medication"))
    && (value.includes("vitamin") || value.includes("supplement") || value.includes("herbal"))
    && value.includes("early")
    && (value.includes("cannot supply") || value.includes("hold the supply"))
    && (value.includes("prescriber") || value.includes("doctor"))
    && value.includes("one capsule")
    && value.includes("three times")
    && value.includes("course");
}

export function matchesGuidedSafetyMessage(message: string): boolean {
  const value = normaliseTutorialMessage(message);
  return (value.includes("food") || value.includes("milk"))
    && (value.includes("nausea") || value.includes("sick"))
    && value.includes("urgent")
    && (value.includes("swelling") || value.includes("breathing") || value.includes("allergic"))
    && (value.includes("plan back") || value.includes("own words"))
    && value.includes("question");
}
