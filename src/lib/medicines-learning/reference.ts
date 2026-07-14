export type MedicineProfileReviewStatus = "educator_review_required" | "educator_reviewed";

export interface MedicineLearningSection {
  heading: string;
  detail: string;
}

export interface MedicineLearningProfile {
  id: string;
  genericName: string;
  aliases: string[];
  medicineClass: string;
  summary: string;
  sections: MedicineLearningSection[];
  labelReasoningClues: string[];
  reviewStatus: MedicineProfileReviewStatus;
  reviewNote: string;
}

export interface PublicMedicineReference {
  id: string;
  label: string;
  description: string;
  url: string;
}

export const PUBLIC_MEDICINE_REFERENCES: PublicMedicineReference[] = [
  {
    id: "tga-cmi",
    label: "TGA Consumer Medicine Information",
    description: "Public product information written for patients, including use, precautions, interactions, side effects and storage.",
    url: "https://www.tga.gov.au/products/regulations-all-products/about-australian-register-therapeutic-goods-artg/consumer-medicine-information-cmi",
  },
  {
    id: "tga-pi",
    label: "TGA Product Information",
    description: "Public TGA-approved professional product information. Search the exact product and formulation.",
    url: "https://www.tga.gov.au/products/regulations-all-products/about-australian-register-therapeutic-goods-artg/product-information-pi",
  },
  {
    id: "healthdirect",
    label: "Healthdirect medicines search",
    description: "Free Australian medicine search by active ingredient or brand name.",
    url: "https://www.healthdirect.gov.au/medicines",
  },
  {
    id: "pbs",
    label: "PBS medicine listing",
    description: "Current public PBS listings and item information. PBS listing does not replace product information.",
    url: "https://www.pbs.gov.au/browse/medicine-listing",
  },
];

const REVIEW_NOTE =
  "Draft teaching summary. A pharmacist educator must validate it against the exact Australian product information and the current course-approved label reference before it is treated as an assessment source.";

export const MEDICINE_LEARNING_PROFILES: MedicineLearningProfile[] = [
  {
    id: "erythromycin",
    genericName: "Erythromycin",
    aliases: ["erythromycin mayne", "macrolide", "antibiotic"],
    medicineClass: "Macrolide antibacterial",
    summary: "A product-specific check is important because formulation and administration instructions can differ. Confirm the prescribed dosage form before deriving any label or counselling point.",
    sections: [
      { heading: "Product and form", detail: "The current simulator case supplies oral capsules. Do not transfer liquid-preparation instructions to a capsule product." },
      { heading: "Administration", detail: "Check the exact product information for food instructions and the prescribed dose and frequency." },
      { heading: "Counselling focus", detail: "Review gastrointestinal effects, allergy safety-netting, interactions and the intended treatment duration." },
    ],
    labelReasoningClues: [
      "Does the exact product have administration advice relating to food?",
      "Is a common gastrointestinal effect important enough to highlight at handover?",
      "What adherence instruction applies to the prescribed treatment course?",
    ],
    reviewStatus: "educator_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "warfarin",
    genericName: "Warfarin",
    aliases: ["coumadin", "marevan", "anticoagulant"],
    medicineClass: "Vitamin K antagonist anticoagulant",
    summary: "Warfarin has a narrow therapeutic range. The student should connect the current dose plan, monitoring and interaction risks before deciding what labels or counselling are required.",
    sections: [
      { heading: "Dose plan", detail: "Confirm the current anticoagulation plan rather than assuming that tablet strength equals the daily dose." },
      { heading: "Monitoring", detail: "Identify the relevant blood test and confirm follow-up arrangements." },
      { heading: "Interactions and bleeding", detail: "Check prescription, over-the-counter and complementary products, with particular attention to analgesics and signs of bleeding." },
    ],
    labelReasoningClues: [
      "Does this medicine require ongoing laboratory monitoring?",
      "Which common over-the-counter pain medicines require pharmacist advice first?",
      "What alcohol-related counselling is appropriate for this patient and product?",
    ],
    reviewStatus: "educator_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "amoxicillin",
    genericName: "Amoxicillin",
    aliases: ["amoxycillin", "amoxicillin suspension", "amoxycillin suspension", "penicillin", "antibiotic"],
    medicineClass: "Penicillin antibacterial",
    summary: "For an oral suspension, label decisions depend on the exact product after reconstitution as well as the prescribed course. Verify the selected brand and concentration.",
    sections: [
      { heading: "Preparation", detail: "Confirm that the powder has been reconstituted correctly and that the final concentration matches the prescription." },
      { heading: "Using a suspension", detail: "Consider what the carer must do before measuring each dose and which measuring device is appropriate." },
      { heading: "Storage and duration", detail: "Use the exact product information for post-reconstitution storage and beyond-use instructions, then check that the supplied volume covers the course." },
    ],
    labelReasoningClues: [
      "What instruction helps redistribute medicine in a suspension before measuring?",
      "Does the exact reconstituted product require a particular storage condition?",
      "What adherence instruction applies to the prescribed treatment course?",
    ],
    reviewStatus: "educator_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "temazepam",
    genericName: "Temazepam",
    aliases: ["temaze", "benzodiazepine", "hypnotic"],
    medicineClass: "Benzodiazepine hypnotic",
    summary: "Assess sedation, impairment, other central nervous system depressants and dependence risk. The simulator case also requires a clinical decision before supply.",
    sections: [
      { heading: "Sedation", detail: "Consider next-day impairment and how the medicine may affect driving, machinery and falls risk." },
      { heading: "Other depressants", detail: "Ask about alcohol, opioids, sedating antihistamines and other medicines that may add to sedation." },
      { heading: "Duration and withdrawal", detail: "Review intended duration, previous use and the risks of abrupt cessation after regular use." },
    ],
    labelReasoningClues: [
      "Which impairment warning is relevant to a sedating medicine?",
      "What advice is required about alcohol and other sedatives?",
      "Could sudden cessation after regular use create a safety problem?",
    ],
    reviewStatus: "educator_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "metformin",
    genericName: "Metformin",
    aliases: ["biguanide", "diabetes medicine"],
    medicineClass: "Biguanide glucose-lowering medicine",
    summary: "Connect administration advice with gastrointestinal tolerability, and identify the patient and medicine factors that make renal monitoring and interaction review important.",
    sections: [
      { heading: "Administration", detail: "Check how taking the medicine in relation to meals may affect tolerability." },
      { heading: "Monitoring", detail: "Review renal function and other monitoring relevant to continuing treatment safely." },
      { heading: "Interactions and acute illness", detail: "Check medicines that may alter metformin exposure and circumstances that may require clinical review." },
    ],
    labelReasoningClues: [
      "Would administration with a meal reduce a common tolerability problem?",
      "Which ongoing laboratory monitoring is relevant in this patient?",
      "Does the patient's renal function or medicine list require escalation before supply?",
    ],
    reviewStatus: "educator_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "doxycycline",
    genericName: "Doxycycline",
    aliases: ["tetracycline", "doxy", "antibiotic"],
    medicineClass: "Tetracycline antibacterial",
    summary: "Administration technique and separation from interacting products are central. The student should also consider photosensitivity and the treatment indication and duration.",
    sections: [
      { heading: "Administration technique", detail: "Check fluid volume, posture and timing before lying down to reduce oesophageal injury risk." },
      { heading: "Interactions", detail: "Review antacids, mineral supplements and relevant foods, then determine an appropriate separation interval from the current reference." },
      { heading: "Sun and duration", detail: "Consider photosensitivity precautions and confirm the intended treatment duration for the prescribed indication." },
    ],
    labelReasoningClues: [
      "What fluid and posture instructions reduce oesophageal injury risk?",
      "Which products or foods need a separation interval?",
      "What sun-exposure precaution may be relevant?",
      "Does the prescribed indication require a course-completion instruction?",
    ],
    reviewStatus: "educator_review_required",
    reviewNote: REVIEW_NOTE,
  },
];

export function normalizeMedicineQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/amoxycillin/g, "amoxicillin")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchMedicineLearningProfiles(query: string): MedicineLearningProfile[] {
  const normalized = normalizeMedicineQuery(query);
  if (!normalized) return MEDICINE_LEARNING_PROFILES;
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return MEDICINE_LEARNING_PROFILES
    .map((profile) => {
      const generic = normalizeMedicineQuery(profile.genericName);
      const haystack = normalizeMedicineQuery(
        [profile.genericName, profile.medicineClass, ...profile.aliases].join(" ")
      );
      const matchingTokens = tokens.filter((token) => haystack.includes(token)).length;
      const score =
        (generic === normalized ? 100 : 0) +
        (normalized.startsWith(generic) || generic.startsWith(normalized) ? 40 : 0) +
        matchingTokens;
      return { profile, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.profile.genericName.localeCompare(b.profile.genericName))
    .map(({ profile }) => profile);
}

export function findBestMedicineLearningProfile(query: string): MedicineLearningProfile | null {
  return searchMedicineLearningProfiles(query)[0] ?? null;
}
