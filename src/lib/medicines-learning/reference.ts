export type MedicineProfileReviewStatus =
  | "pharmacist_review_required"
  | "pharmacist_reviewed";

export interface MedicineLearningSection {
  id: string;
  heading: string;
  summary: string;
  bullets: string[];
}

export interface MedicineQuickFact {
  label: string;
  value: string;
}

export interface MedicineProductRow {
  product: string;
  formAndStrength: string;
  learningNote: string;
}

export interface MedicineProfileSource {
  label: string;
  sourceType: "TGA PI/CMI" | "PBS" | "jurisdiction";
  url: string;
  lastChecked: string;
}

export interface MedicineWarningLabelAnswer {
  code: string;
  label: string;
  appliesWhen: string;
  rationale: string;
}

export interface MedicineDoseGuideRow {
  population: string;
  indication: string;
  productInformationDose: string;
  notes: string;
}

export interface MedicineInteractionRow {
  medicineOrClass: string;
  risk: string;
  action: string;
}

export interface MedicineClinicalGuide {
  warningLabels: MedicineWarningLabelAnswer[];
  dosing: MedicineDoseGuideRow[];
  commonSideEffects: string[];
  urgentCare: string[];
  interactions: MedicineInteractionRow[];
}

export interface MedicineLearningProfile {
  id: string;
  genericName: string;
  aliases: string[];
  medicineClass: string;
  summary: string;
  quickFacts: MedicineQuickFact[];
  sections: MedicineLearningSection[];
  products: MedicineProductRow[];
  labelReasoningClues: string[];
  clinicalGuide: MedicineClinicalGuide;
  sources: MedicineProfileSource[];
  version: string;
  contentUpdatedAt: string;
  nextReviewDue: string;
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
    label: "TGA PI and CMI repository",
    description: "Search the exact Australian brand and formulation for professional and consumer product information.",
    url: "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm",
  },
  {
    id: "artg",
    label: "Australian Register of Therapeutic Goods",
    description: "Confirm that a product is registered and identify its sponsor and approved product records.",
    url: "https://www.tga.gov.au/resources/artg",
  },
  {
    id: "healthdirect",
    label: "Healthdirect medicines search",
    description: "Free Australian patient-oriented medicine search by active ingredient or brand name.",
    url: "https://www.healthdirect.gov.au/medicines",
  },
  {
    id: "pbs",
    label: "PBS medicine search",
    description: "Check current item codes, forms, pack sizes, restrictions, quantities, repeats and listed brands.",
    url: "https://www.pbs.gov.au/pbs/search?search-type=medicines",
  },
  {
    id: "pbs-authorities",
    label: "PBS authority prescription guidance",
    description: "Distinguish prior approval numbers from streamlined authority codes and verify what must appear on an authority prescription.",
    url: "https://www.pbs.gov.au/info/healthpro/explanatory-notes/section1/Section_1_2_Explanatory_Notes",
  },
  {
    id: "victoria-pharmacists",
    label: "Victorian pharmacist legal requirements",
    description: "Check prescription authentication, Schedule 8, SafeScript, intervention and lawful-supply duties for Victorian cases.",
    url: "https://www.health.vic.gov.au/drugs-and-poisons/pharmacists",
  },
];

const CONTENT_UPDATED = "15 July 2026";
const NEXT_REVIEW = "Before paid release, then at least annually or when a cited source changes";
const REVIEW_NOTE =
  "Editorial draft for supervised learning. It is deliberately blocked from paid-release approval until an Australian pharmacist educator records a source-by-source review. Always verify the exact product and current jurisdictional requirements.";

function source(
  label: string,
  sourceType: MedicineProfileSource["sourceType"],
  url: string
): MedicineProfileSource {
  return { label, sourceType, url, lastChecked: CONTENT_UPDATED };
}

type MedicineLearningProfileBase = Omit<MedicineLearningProfile, "clinicalGuide">;

const BASE_MEDICINE_LEARNING_PROFILES: MedicineLearningProfileBase[] = [
  {
    id: "erythromycin",
    genericName: "Erythromycin",
    aliases: ["erythromycin mayne", "eryc", "macrolide", "antibiotic"],
    medicineClass: "Macrolide antibacterial",
    summary:
      "Confirm the exact salt, formulation and brand before applying administration, interaction or storage advice. The simulator case is an oral enteric capsule, not a reconstituted liquid.",
    quickFacts: [
      { label: "Case product", value: "Mayne Pharma Erythromycin 250 mg enteric capsule" },
      { label: "Schedule", value: "S4" },
      { label: "Key check", value: "Allergy, interacting medicines, dose and dosage form" },
      { label: "Current PBS check", value: "Use item 1404X listing; do not rely on historical price fields" },
    ],
    sections: [
      {
        id: "use",
        heading: "Uses and place in therapy",
        summary: "An antibacterial used for susceptible infections; indication and duration must come from the prescription and current therapeutic guidance.",
        bullets: [
          "Do not infer the infection or duration from the medicine name alone.",
          "Check whether cultures, local guidance or previous treatment affect the intended plan.",
        ],
      },
      {
        id: "before-supply",
        heading: "Before supply",
        summary: "Reconcile allergy history, current medicines and factors that can increase toxicity or interaction risk.",
        bullets: [
          "Ask about previous macrolide reactions and clarify the nature and timing of any reaction.",
          "Review medicines associated with clinically important interactions, including medicines affecting cardiac rhythm or erythromycin metabolism.",
          "Escalate unexplained high doses, unsuitable formulation, duplicate antibiotic therapy or a clinically significant interaction.",
        ],
      },
      {
        id: "administration",
        heading: "Dose and administration",
        summary: "Transcribe the prescribed dose and frequency exactly, then check product-specific administration instructions.",
        bullets: [
          "Keep capsule advice separate from oral-liquid preparation and storage advice.",
          "Use the exact product PI/CMI to confirm whether food changes administration instructions.",
          "Check that the quantity and repeats are consistent with the prescribed course and the current PBS item.",
        ],
      },
      {
        id: "adverse-effects",
        heading: "Adverse effects and safety-netting",
        summary: "Gastrointestinal effects are common; severe allergy, significant diarrhoea or cardiac symptoms require prompt assessment.",
        bullets: [
          "Explain common effects in patient-friendly language without implying that every patient will experience them.",
          "Provide a clear urgent-action plan for breathing difficulty, facial or throat swelling, widespread rash, fainting or severe/persistent diarrhoea.",
        ],
      },
      {
        id: "counselling",
        heading: "Counselling and follow-up",
        summary: "Confirm the treatment purpose, exact directions, adherence plan, adverse-effect plan and patient understanding.",
        bullets: [
          "Ask the patient to explain how they will take the medicine rather than only asking whether they understand.",
          "Invite questions after resolving the main safety and adherence points.",
        ],
      },
    ],
    products: [
      { product: "Mayne Pharma Erythromycin", formAndStrength: "Enteric capsule 250 mg", learningNote: "Exact product used in case 1; capsule instructions only." },
      { product: "Other erythromycin products", formAndStrength: "Form and strength vary", learningNote: "Search the exact brand in TGA PI/CMI before counselling." },
    ],
    labelReasoningClues: [
      "Does the exact capsule have an administration instruction relating to food?",
      "Which common adverse effect is useful to flag at handover?",
      "What adherence instruction supports the prescribed antibacterial course?",
    ],
    sources: [
      source("TGA PI search: Eryc / erythromycin", "TGA PI/CMI", "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=Eryc&t=pi"),
      source("PBS item 1404X", "PBS", "https://www.pbs.gov.au/medicine/item/1404X"),
    ],
    version: "0.2.0-draft",
    contentUpdatedAt: CONTENT_UPDATED,
    nextReviewDue: NEXT_REVIEW,
    reviewStatus: "pharmacist_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "warfarin",
    genericName: "Warfarin",
    aliases: ["coumadin", "marevan", "vitamin k antagonist", "anticoagulant"],
    medicineClass: "Vitamin K antagonist anticoagulant",
    summary:
      "Warfarin dose is individualised and guided by INR. The tablet strength on the prescription must not be treated as the patient's complete daily dose plan.",
    quickFacts: [
      { label: "Case product", value: "Coumadin 5 mg tablet" },
      { label: "Schedule", value: "S4" },
      { label: "Critical monitoring", value: "Current INR target, result, dose plan and follow-up" },
      { label: "Product distinction", value: "Confirm brand and strength; do not assume brands are interchangeable in a stable regimen" },
    ],
    sections: [
      {
        id: "use",
        heading: "Uses and treatment plan",
        summary: "Used to reduce thromboembolic risk in selected conditions. The indication, target INR and planned duration are patient-specific.",
        bullets: [
          "Confirm who manages anticoagulation and where the patient records their current dose.",
          "Check whether the prescription matches the latest documented plan.",
        ],
      },
      {
        id: "before-supply",
        heading: "Before supply",
        summary: "Bleeding, recent illness, procedures, pregnancy and medicine changes can alter the risk-benefit balance.",
        bullets: [
          "Ask about bleeding or bruising, falls, missed or extra doses, acute illness and planned dental or surgical procedures.",
          "Review all prescription, non-prescription and complementary products; recent starts and stops are particularly important.",
          "Escalate a dose that conflicts with the current plan, unexplained INR instability or clinically significant bleeding.",
        ],
      },
      {
        id: "administration",
        heading: "Dose, missed doses and monitoring",
        summary: "Give only the current prescribed dose plan and confirm the next INR test.",
        bullets: [
          "Do not tell the patient to double a missed dose.",
          "Use the anticoagulation service or prescriber's documented instructions for a missed dose or out-of-range INR.",
          "Confirm tablet strength and colour with the exact brand supplied.",
        ],
      },
      {
        id: "interactions",
        heading: "Interactions and lifestyle",
        summary: "Many medicines and changes in alcohol intake, diet or illness can alter anticoagulant effect.",
        bullets: [
          "Advise the patient to check before starting or stopping medicines, including NSAIDs and complementary products.",
          "Encourage a consistent dietary pattern rather than abrupt major changes in vitamin K intake.",
          "Avoid blanket advice detached from the patient's alcohol use and anticoagulation plan.",
        ],
      },
      {
        id: "safety",
        heading: "Bleeding safety-net",
        summary: "The patient needs a specific plan for urgent and non-urgent bleeding concerns.",
        bullets: [
          "Urgent assessment is needed for severe or uncontrolled bleeding, head injury, vomiting blood, black stools or sudden neurological symptoms.",
          "Explain whom to contact for persistent nosebleeds, unusual bruising or other new bleeding.",
        ],
      },
      {
        id: "counselling",
        heading: "Counselling and teach-back",
        summary: "Check that the patient can state today's dose, the next INR plan, interaction precautions and what to do if bleeding occurs.",
        bullets: [
          "A yes/no understanding question is not enough for a high-risk medicine.",
          "Invite questions only after reconciling the current plan and safety-net.",
        ],
      },
    ],
    products: [
      { product: "Coumadin", formAndStrength: "Tablets including 5 mg", learningNote: "Case 2 product; confirm the exact strength and current dose plan." },
      { product: "Marevan", formAndStrength: "Multiple tablet strengths", learningNote: "Different brand; verify product-specific strength identification and continuity." },
    ],
    labelReasoningClues: [
      "Which ongoing laboratory test must be confirmed?",
      "Which common non-prescription analgesics require advice before use?",
      "What impairment or bleeding risks should drive the handover plan?",
    ],
    sources: [
      source("TGA PI/CMI search: Coumadin", "TGA PI/CMI", "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=Coumadin"),
      source("PBS warfarin 5 mg listing", "PBS", "https://www.pbs.gov.au/medicine/item/2211J-2843P-2844Q"),
    ],
    version: "0.2.0-draft",
    contentUpdatedAt: CONTENT_UPDATED,
    nextReviewDue: NEXT_REVIEW,
    reviewStatus: "pharmacist_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "amoxicillin",
    genericName: "Amoxicillin",
    aliases: ["amoxycillin", "amoxicillin suspension", "amoxycillin suspension", "amoxil", "penicillin", "antibiotic"],
    medicineClass: "Penicillin antibacterial",
    summary:
      "For oral liquid, concentration, reconstitution, dose volume, measuring device, exact-product storage and course volume must all agree.",
    quickFacts: [
      { label: "Case product", value: "Amoxycillin (AN) suspension 250 mg/5 mL" },
      { label: "Schedule", value: "S4" },
      { label: "Critical paediatric check", value: "Patient, age/weight, indication, mg dose, mL dose and concentration" },
      { label: "PBS form", value: "Current listings use powder for oral liquid; verify item and number of packs" },
    ],
    sections: [
      {
        id: "use",
        heading: "Uses and dose validation",
        summary: "Used for susceptible bacterial infections. Paediatric doses depend on indication and patient factors.",
        bullets: [
          "Convert the prescribed mL dose to mg using the selected concentration.",
          "Check age, documented weight, indication, frequency, duration and maximum dose in a current paediatric reference.",
        ],
      },
      {
        id: "before-supply",
        heading: "Before supply",
        summary: "Clarify beta-lactam allergy history and verify the product, total course volume and reconstitution status.",
        bullets: [
          "Distinguish immediate/severe allergy features from non-allergic adverse effects.",
          "Escalate a dose, duration or concentration that is unclear or inconsistent with the patient and indication.",
          "Confirm the supplied number of bottles can provide the complete measured course after reconstitution.",
        ],
      },
      {
        id: "preparation",
        heading: "Preparation and measurement",
        summary: "Reconstitute according to the exact product instructions and counsel using the final concentration.",
        bullets: [
          "Record the reconstitution date and calculated beyond-use date where required by local workflow.",
          "Demonstrate vigorous redistribution before measuring a suspension.",
          "Supply and demonstrate an appropriate oral syringe or medicine measure; avoid kitchen teaspoons.",
        ],
      },
      {
        id: "storage",
        heading: "Storage after reconstitution",
        summary: "Post-reconstitution storage and usable period are product-specific, not generic facts for all amoxicillin liquids.",
        bullets: [
          "Read the exact selected product PI/CMI and dispensing label reference.",
          "Ensure the storage plan is practical for the carer and that the course ends before the product's beyond-use time.",
        ],
      },
      {
        id: "adverse-effects",
        heading: "Adverse effects and safety-netting",
        summary: "Explain common gastrointestinal effects and distinguish them from urgent allergy or severe skin/gut symptoms.",
        bullets: [
          "Urgent help is required for breathing difficulty, facial or throat swelling, widespread hives, blistering rash or collapse.",
          "Seek clinical advice for severe or persistent diarrhoea, particularly with blood or mucus.",
        ],
      },
      {
        id: "counselling",
        heading: "Carer counselling and teach-back",
        summary: "The carer should be able to demonstrate preparation, measurement, timing, storage and course completion.",
        bullets: [
          "Ask the carer to explain and, where possible, show how each dose will be prepared and measured.",
          "Confirm what they will do after a missed dose and who to contact if the child cannot keep doses down.",
        ],
      },
    ],
    products: [
      { product: "Amoxycillin (AN)", formAndStrength: "Suspension 250 mg/5 mL", learningNote: "Exact simulator product; verify its current PI/CMI before applying storage advice." },
      { product: "Amoxil Forte and other brands", formAndStrength: "Powder for oral liquid 250 mg/5 mL", learningNote: "Brands may have different preparation or storage wording." },
      { product: "Amoxicillin capsules", formAndStrength: "Multiple strengths", learningNote: "Wrong dosage form for this case; liquid instructions do not apply." },
    ],
    labelReasoningClues: [
      "What instruction redistributes a suspension before dose measurement?",
      "What does the exact brand require after reconstitution?",
      "Which adherence instruction applies to the prescribed course?",
    ],
    sources: [
      source("TGA PI/CMI search: amoxicillin oral liquid", "TGA PI/CMI", "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=amoxicillin"),
      source("PBS amoxicillin 250 mg/5 mL listing", "PBS", "https://www.pbs.gov.au/medicine/item/3393N"),
    ],
    version: "0.2.0-draft",
    contentUpdatedAt: CONTENT_UPDATED,
    nextReviewDue: NEXT_REVIEW,
    reviewStatus: "pharmacist_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "temazepam",
    genericName: "Temazepam",
    aliases: ["temaze", "temtabs", "normison", "benzodiazepine", "hypnotic"],
    medicineClass: "Benzodiazepine hypnotic",
    summary:
      "Temazepam is Schedule 4 and is monitored in Victoria's SafeScript. Sedation, impairment, dependence, combined depressants and the intended short-term plan require active review.",
    quickFacts: [
      { label: "Case product", value: "Temaze 10 mg tablet" },
      { label: "Schedule", value: "S4; SafeScript-monitored in Victoria" },
      { label: "Critical legal step (Victoria)", value: "Check SafeScript before supply unless a specific exception applies" },
      { label: "Key risk", value: "Additive sedation, falls, impaired driving, misuse and dependence" },
    ],
    sections: [
      {
        id: "use",
        heading: "Uses and intended duration",
        summary: "A hypnotic for selected patients with insomnia; clarify treatment goal, duration and previous use.",
        bullets: [
          "Review whether the quantity, directions and repeat pattern fit the documented short-term plan.",
          "Avoid presenting ongoing nightly use as routine without clinical review.",
        ],
      },
      {
        id: "legal",
        heading: "Victorian SafeScript workflow",
        summary: "SafeScript is a clinical and legal workflow step, not an automatic supply decision.",
        bullets: [
          "Check the patient's SafeScript profile on each dispensing occasion unless a recognised exception applies.",
          "Review alerts, multiple prescribers/pharmacies and recent monitored-medicine history in clinical context.",
          "Document the assessment and any prescriber contact; an alert identifies risk but does not itself prohibit supply.",
        ],
      },
      {
        id: "before-supply",
        heading: "Before supply",
        summary: "Assess other depressants, alcohol and substance-use history, falls, breathing risk, pregnancy and prior benzodiazepine exposure.",
        bullets: [
          "Review opioids, sedating antihistamines, antipsychotics and other medicines that can add to sedation.",
          "Escalate an unsafe dose/quantity, inconsistent history, significant interaction or unclear therapeutic need.",
          "Do not abruptly stop long-term regular treatment without an appropriate plan.",
        ],
      },
      {
        id: "administration",
        heading: "Administration and impairment",
        summary: "Give the exact bedtime directions and explain that next-day impairment can occur.",
        bullets: [
          "Discuss driving, machinery and activities requiring alertness using the current product information and patient circumstances.",
          "Alcohol can intensify sedation and should not be combined with treatment; check before using any additional sedative.",
        ],
      },
      {
        id: "adverse-effects",
        heading: "Adverse effects and escalation",
        summary: "Drowsiness, dizziness, impaired coordination and memory effects can affect safety.",
        bullets: [
          "Provide an urgent plan for severe sedation, difficult breathing, collapse, unusual behaviour or suspected overdose.",
          "Discuss falls prevention where age, frailty or other medicines increase risk.",
        ],
      },
      {
        id: "counselling",
        heading: "Counselling and teach-back",
        summary: "The patient should be able to explain dose, timing, impairment precautions, duration and whom to contact before changing treatment.",
        bullets: [
          "Use teach-back to test the safety plan, not memory of technical terminology.",
          "Close by checking remaining concerns without reopening a resolved question.",
        ],
      },
    ],
    products: [
      { product: "Temaze", formAndStrength: "Tablet 10 mg", learningNote: "Exact case product; the current PBS listing includes 25-tablet packs." },
      { product: "Temtabs, Normison and equivalent brands", formAndStrength: "Tablet 10 mg", learningNote: "Confirm the exact prescribed brand and substitution status." },
    ],
    labelReasoningClues: [
      "Which warnings address sedation and psychomotor impairment?",
      "What advice is required about alcohol and other sedatives?",
      "Could abrupt cessation after regular use create a safety problem?",
    ],
    sources: [
      source("TGA PI/CMI search: Temtabs", "TGA PI/CMI", "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=Temtabs"),
      source("PBS temazepam 10 mg listing", "PBS", "https://www.pbs.gov.au/medicine/item/5221T"),
      source("Victoria: medicines monitored in SafeScript", "jurisdiction", "https://www.health.vic.gov.au/drugs-and-poisons/medicines-monitored-in-safescript"),
      source("Victoria: SafeScript for prescribers and pharmacists", "jurisdiction", "https://www.health.vic.gov.au/safescript/safescript-for-prescribers-and-pharmacists"),
    ],
    version: "0.2.0-draft",
    contentUpdatedAt: CONTENT_UPDATED,
    nextReviewDue: NEXT_REVIEW,
    reviewStatus: "pharmacist_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "metformin",
    genericName: "Metformin",
    aliases: [
      "metformin an", "biguanide", "diabetes medicine",
      "metex", "metex xr", "diabex", "diabex xr", "metformin xr",
      "extended release", "modified release",
    ],
    medicineClass: "Biguanide glucose-lowering medicine",
    summary:
      "Confirm formulation, renal function, gastrointestinal tolerance, acute illness and interacting medicines. Immediate-release and modified-release products are not interchangeable instructions.",
    quickFacts: [
      { label: "Case product", value: "Metformin (AN) immediate-release tablet 1000 mg" },
      { label: "Schedule", value: "S4" },
      { label: "Core monitoring", value: "Renal function, glycaemic plan and longer-term monitoring as clinically indicated" },
      { label: "Formulation check", value: "Immediate release versus modified release" },
    ],
    sections: [
      {
        id: "use",
        heading: "Uses and treatment plan",
        summary: "Used in type 2 diabetes and selected other indications; confirm the intended formulation and place in the patient's regimen.",
        bullets: [
          "Reconcile dose and formulation with previous supply and current diabetes plan.",
          "Do not transfer modified-release administration instructions to immediate-release tablets.",
        ],
      },
      {
        id: "before-supply",
        heading: "Before supply",
        summary: "Renal function, dehydration, acute illness and interacting medicines influence safe use.",
        bullets: [
          "Review current renal function and whether the dose remains appropriate.",
          "Ask about vomiting, diarrhoea, reduced intake, severe infection or other acute illness that may require clinical review.",
          "Check medicines that can alter renal function or metformin exposure; escalate a clinically significant interaction rather than relying on a generic warning.",
        ],
      },
      {
        id: "administration",
        heading: "Dose and administration",
        summary: "Give the exact prescribed frequency and product-specific meal instructions.",
        bullets: [
          "Meal timing can improve gastrointestinal tolerability for immediate-release metformin.",
          "Confirm what the patient should do after a missed dose; do not advise doubling.",
        ],
      },
      {
        id: "procedures",
        heading: "Procedures and temporary review",
        summary: "Some acute illnesses and procedures involving iodinated contrast or fasting may require a clinician-directed interruption plan.",
        bullets: [
          "Ask about upcoming imaging, surgery or prolonged fasting when relevant.",
          "Do not invent a stop/restart interval; follow the treating team and current product/clinical guidance.",
        ],
      },
      {
        id: "adverse-effects",
        heading: "Adverse effects and safety-netting",
        summary: "Gastrointestinal effects are common. Possible lactic acidosis is rare but urgent.",
        bullets: [
          "Explain strategies for common nausea, diarrhoea or abdominal discomfort and when persistence needs review.",
          "Urgent assessment is required for severe systemic illness with symptoms such as marked weakness, breathing difficulty, unusual sleepiness or persistent vomiting.",
        ],
      },
      {
        id: "monitoring",
        heading: "Monitoring and counselling",
        summary: "Connect renal and glycaemic monitoring to the patient's plan and verify understanding of sick-day escalation.",
        bullets: [
          "Review longer-term monitoring, including vitamin B12 where clinically indicated.",
          "Ask the patient to explain when they would seek advice during acute illness.",
        ],
      },
    ],
    products: [
      { product: "Metformin (AN)", formAndStrength: "Immediate-release tablet 1000 mg", learningNote: "Exact case product." },
      { product: "Other immediate-release brands", formAndStrength: "500 mg, 850 mg or 1 g products", learningNote: "Strength and pack size vary; verify the exact selected record." },
      { product: "Modified-release metformin", formAndStrength: "Modified-release tablets", learningNote: "Different formulation and administration instructions; not the case product." },
    ],
    labelReasoningClues: [
      "Would administration with food improve tolerability for this formulation?",
      "Which patient-specific laboratory monitoring is relevant?",
      "Does renal function, acute illness or the medicine list require escalation?",
    ],
    sources: [
      source("TGA PI/CMI search: metformin", "TGA PI/CMI", "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=metformin"),
      source("PBS medicine search: metformin", "PBS", "https://www.pbs.gov.au/pbs/search?search-type=medicines&term=metformin"),
    ],
    version: "0.2.0-draft",
    contentUpdatedAt: CONTENT_UPDATED,
    nextReviewDue: NEXT_REVIEW,
    reviewStatus: "pharmacist_review_required",
    reviewNote: REVIEW_NOTE,
  },
  {
    id: "doxycycline",
    genericName: "Doxycycline",
    aliases: ["doxycycline an", "doxy", "doxylin", "tetracycline", "antibiotic"],
    medicineClass: "Tetracycline antibacterial",
    summary:
      "Administration technique, interacting mineral products, photosensitivity, pregnancy/age considerations and the indication-specific duration are central to safe supply.",
    quickFacts: [
      { label: "Case product", value: "Doxycycline (AN) tablet 50 mg" },
      { label: "Schedule", value: "S4" },
      { label: "Administration focus", value: "Adequate water and remaining upright" },
      { label: "Interaction focus", value: "Antacids and products containing polyvalent minerals" },
    ],
    sections: [
      {
        id: "use",
        heading: "Uses and duration",
        summary: "Doxycycline has several indications with different doses and durations; confirm the intended condition and plan.",
        bullets: [
          "Do not automatically describe every doxycycline prescription as a short antibiotic course.",
          "Check whether long-term use, prophylaxis or dermatological treatment changes the counselling emphasis.",
        ],
      },
      {
        id: "before-supply",
        heading: "Before supply",
        summary: "Review pregnancy, breastfeeding, patient age, swallowing problems and interacting products.",
        bullets: [
          "Ask about antacids, iron, calcium, magnesium, zinc and multivitamin products.",
          "Escalate pregnancy, an unsuitable age/dose, significant swallowing disorder or an unclear indication/duration using current guidance.",
          "Check previous tetracycline reactions and the patient's ability to follow the administration technique.",
        ],
      },
      {
        id: "administration",
        heading: "Administration technique",
        summary: "Correct technique reduces oesophageal irritation and ulceration risk.",
        bullets: [
          "Use adequate water and remain upright after the dose for the product-recommended interval.",
          "Avoid taking the dose immediately before lying down or going to bed.",
          "Give the prescribed dose and timing exactly; do not merge it with interaction-separation advice.",
        ],
      },
      {
        id: "interactions",
        heading: "Interactions and separation",
        summary: "Polyvalent cations can reduce doxycycline absorption; construct a practical schedule from the exact products used.",
        bullets: [
          "Use current product information to determine the interval before or after antacids and mineral supplements.",
          "Ask the patient to explain the schedule back using their actual breakfast, antacid and supplement times.",
        ],
      },
      {
        id: "adverse-effects",
        heading: "Adverse effects and safety-netting",
        summary: "Gastrointestinal effects and photosensitivity are important; severe swallowing pain, allergy or severe skin reaction need assessment.",
        bullets: [
          "Discuss sun protection and what to do if marked photosensitivity occurs.",
          "Seek prompt help for difficulty or pain on swallowing, severe chest pain after dosing, breathing difficulty, facial swelling or blistering rash.",
        ],
      },
      {
        id: "counselling",
        heading: "Counselling and teach-back",
        summary: "The patient should be able to explain dose, water/posture technique, separation schedule, sun plan and intended duration.",
        bullets: [
          "Resolve the patient's real concern before inviting final questions.",
          "Do not give a blanket backup-contraception rule; assess the actual contraceptive method and clinical circumstances using current guidance.",
        ],
      },
    ],
    products: [
      { product: "Doxycycline (AN)", formAndStrength: "Tablet 50 mg", learningNote: "Exact case product; confirm current registration/product information." },
      { product: "Other immediate-release brands", formAndStrength: "50 mg and 100 mg products", learningNote: "Brand, salt, formulation and pack size vary." },
      { product: "Modified-release doxycycline", formAndStrength: "Modified-release capsules", learningNote: "Not interchangeable with the case product's directions." },
    ],
    labelReasoningClues: [
      "What fluid and posture instructions reduce oesophageal injury risk?",
      "Which products need a separation interval?",
      "What sun-exposure precaution is relevant?",
      "Does the actual indication require a course-completion instruction?",
    ],
    sources: [
      source("TGA PI search: doxycycline", "TGA PI/CMI", "https://www.ebs.tga.gov.au/ebs/picmi/picmirepository.nsf/PICMI?OpenForm=&q=doxycycline&t=pi"),
      source("PBS medicine search: doxycycline", "PBS", "https://www.pbs.gov.au/pbs/search?search-type=medicines&term=doxycycline"),
    ],
    version: "0.2.0-draft",
    contentUpdatedAt: CONTENT_UPDATED,
    nextReviewDue: NEXT_REVIEW,
    reviewStatus: "pharmacist_review_required",
    reviewNote: REVIEW_NOTE,
  },
];

interface ComplexProfileConfig {
  id: string;
  genericName: string;
  aliases: string[];
  medicineClass: string;
  summary: string;
  caseProduct: string;
  schedule: string;
  sourceUrl: string;
  extraSource?: MedicineProfileSource;
}

function complexProfile(config: ComplexProfileConfig): MedicineLearningProfileBase {
  return {
    id: config.id,
    genericName: config.genericName,
    aliases: config.aliases,
    medicineClass: config.medicineClass,
    summary: config.summary,
    quickFacts: [
      { label: "Case product", value: config.caseProduct },
      { label: "Schedule", value: config.schedule },
      { label: "Dose rule", value: "Confirm the indication, patient factors and exact formulation before supply" },
      { label: "Release gate", value: "Draft requires Australian pharmacist educator review" },
    ],
    sections: [
      {
        id: "indications",
        heading: "Indications and place in therapy",
        summary: "The intended condition changes the dose, duration and PBS restriction.",
        bullets: [
          "Confirm the documented indication rather than inferring it from the medicine name.",
          "Check the current Australian product information and PBS restriction for the exact strength and form.",
        ],
      },
      {
        id: "before-supply",
        heading: "Before supply",
        summary: "Reconcile identity, age, allergies, current medicines, organ function and previous exposure.",
        bullets: [
          "Resolve prescription, prescriber, authority and patient-record discrepancies before supply.",
          "Use the history and patient conversation to identify contraindications, interactions and monitoring gaps.",
        ],
      },
      {
        id: "dose",
        heading: "Dose and administration",
        summary: "Use the structured dose table below as a learning prompt, then verify the current exact-product PI.",
        bullets: [
          "Do not transfer a dose between indications, age groups, formulations or renal-function categories.",
          "Treat unusual frequency, dose, quantity or release-form manipulation as a reason to stop and clarify.",
        ],
      },
      {
        id: "safety",
        heading: "Adverse effects, interactions and escalation",
        summary: "Separate common effects from symptoms requiring urgent assessment.",
        bullets: [
          "Give the patient a specific action for each serious red flag.",
          "Ask the patient to explain the dose and safety plan back in their own words.",
        ],
      },
    ],
    products: [
      { product: config.caseProduct, formAndStrength: "Exact simulator product", learningNote: "Brand-specific selection is required in this case." },
      { product: `Other ${config.genericName} products`, formAndStrength: "Strengths and formulations vary", learningNote: "Do not assume interchangeability; check release form, strength, pack and substitution instruction." },
    ],
    labelReasoningClues: [
      "Which labels apply to this exact formulation and route?",
      "Which patient factor changes the dose or supply decision?",
      "Which interaction or urgent-care symptom must be discussed?",
    ],
    sources: [
      source(`TGA product information: ${config.caseProduct}`, "TGA PI/CMI", config.sourceUrl),
      source(`PBS medicine search: ${config.genericName}`, "PBS", `https://www.pbs.gov.au/pbs/search?search-type=medicines&term=${encodeURIComponent(config.genericName)}`),
      ...(config.extraSource ? [config.extraSource] : []),
    ],
    version: "0.3.0-draft",
    contentUpdatedAt: CONTENT_UPDATED,
    nextReviewDue: NEXT_REVIEW,
    reviewStatus: "pharmacist_review_required",
    reviewNote: REVIEW_NOTE,
  };
}

const CONTROLLED_MEDICINES_SOURCE = source(
  "Victorian legislative requirements for pharmacists",
  "jurisdiction",
  "https://www.health.vic.gov.au/drugs-and-poisons/pharmacists"
);

const COMPLEX_MEDICINE_PROFILES: MedicineLearningProfileBase[] = [
  complexProfile({
    id: "oxycodone",
    genericName: "Oxycodone",
    aliases: ["oxycontin", "oxycodone mr", "opioid", "controlled drug"],
    medicineClass: "Strong opioid analgesic",
    summary: "Modified-release oxycodone requires confirmed opioid history, exact 12-hour dosing, intact-tablet administration, overdose safety-netting and secure Schedule 8 handling.",
    caseProduct: "OxyContin modified-release tablet 20 mg",
    schedule: "S8 / SafeScript monitored in Victoria",
    sourceUrl: "https://www.tga.gov.au/resources/artg/200033",
    extraSource: CONTROLLED_MEDICINES_SOURCE,
  }),
  complexProfile({
    id: "fentanyl",
    genericName: "Fentanyl",
    aliases: ["durogesic", "fentanyl patch", "transdermal opioid", "controlled drug"],
    medicineClass: "Potent transdermal opioid analgesic",
    summary: "Transdermal fentanyl is a high-risk formulation for opioid-tolerant patients; heat, patch duplication and accidental exposure can cause fatal overdose.",
    caseProduct: "Durogesic transdermal patch 25 micrograms/hour",
    schedule: "S8 / SafeScript monitored in Victoria",
    sourceUrl: "https://www.tga.gov.au/resources/artg/112368",
    extraSource: CONTROLLED_MEDICINES_SOURCE,
  }),
  complexProfile({
    id: "dexamfetamine",
    genericName: "Dexamfetamine",
    aliases: ["dexamphetamine", "aspen dexamfetamine", "stimulant", "adhd"],
    medicineClass: "Central nervous system psychostimulant",
    summary: "Dexamfetamine requires age- and indication-specific specialist oversight, cardiovascular and growth monitoring, secure storage and Schedule 8 prescription authentication.",
    caseProduct: "Aspen Dexamfetamine tablet 5 mg",
    schedule: "S8 special Schedule 8 psychostimulant",
    sourceUrl: "https://www.tga.gov.au/resources/artg/19684",
    extraSource: CONTROLLED_MEDICINES_SOURCE,
  }),
  complexProfile({
    id: "methotrexate",
    genericName: "Methotrexate",
    aliases: ["methotrexate cipla", "mtx", "weekly medicine", "antimetabolite"],
    medicineClass: "Antimetabolite and immunomodulator",
    summary: "For inflammatory disease, methotrexate is normally weekly, not daily. Dose-day, folate, pregnancy status, interactions and laboratory monitoring are critical.",
    caseProduct: "Methotrexate Cipla tablet 10 mg",
    schedule: "S4 high-risk medicine",
    sourceUrl: "https://www.tga.gov.au/resources/artg/365594",
  }),
  complexProfile({
    id: "lithium",
    genericName: "Lithium carbonate",
    aliases: ["quilonum", "quilonum sr", "lithicarb", "mood stabiliser"],
    medicineClass: "Mood stabiliser with a narrow therapeutic index",
    summary: "Lithium dosing is concentration-guided. Dehydration, renal-function change, salt change and interacting medicines can quickly produce toxicity.",
    caseProduct: "Quilonum SR tablet 450 mg",
    schedule: "S4",
    sourceUrl: "https://www.tga.gov.au/sites/default/files/2022-11/foi-3988-02.pdf",
  }),
  complexProfile({
    id: "apixaban",
    genericName: "Apixaban",
    aliases: ["eliquis", "factor xa inhibitor", "doac", "anticoagulant"],
    medicineClass: "Direct factor Xa inhibitor anticoagulant",
    summary: "Apixaban dose and duration depend on indication, renal function and patient factors. Missed doses, interacting medicines and bleeding plans need explicit counselling.",
    caseProduct: "Eliquis film-coated tablet 5 mg",
    schedule: "S4",
    sourceUrl: "https://www.tga.gov.au/resources/artg/193474",
  }),
  complexProfile({
    id: "sitagliptin",
    genericName: "Sitagliptin",
    aliases: ["januvia", "janumet", "dpp-4 inhibitor", "gliptin", "diabetes medicine"],
    medicineClass: "DPP-4 inhibitor glucose-lowering medicine",
    summary: "Sitagliptin is a PBS authority item usually added to metformin. Check the indication against the streamlined restriction, confirm renal function for dose selection, and counsel on hypoglycaemia risk when combined with other glucose-lowering medicines.",
    caseProduct: "Januvia tablet 100 mg",
    schedule: "S4 / PBS authority (streamlined)",
    sourceUrl: "https://www.tga.gov.au/resources/artg/142351",
  }),
];

const CLINICAL_GUIDES: Record<string, MedicineClinicalGuide> = {
  erythromycin: {
    warningLabels: [
      { code: "18 / L18", label: "Take with food or milk", appliesWhen: "Use only when supported by the exact erythromycin salt/formulation PI; food advice differs between products.", rationale: "Reduces gastrointestinal upset for applicable products without overriding formulation-specific absorption advice." },
      { code: "5 / L5", label: "Complete the full course", appliesWhen: "When prescribed as a defined antibacterial course.", rationale: "Supports adherence to the prescribed duration; do not apply automatically to long-term non-infective use." },
      { code: "D / UAF", label: "May cause nausea", appliesWhen: "Oral erythromycin products.", rationale: "Gastrointestinal adverse effects are common." },
    ],
    dosing: [
      { population: "Adults", indication: "Susceptible infection", productInformationDose: "Common PI range: 1–2 g/day in divided doses; up to 4 g/day for severe infection.", notes: "Exact interval, salt and maximum vary by product and infection." },
      { population: "Children", indication: "Susceptible infection", productInformationDose: "Common PI range: 30–50 mg/kg/day in divided doses; higher specialist-directed doses may be used for severe infection.", notes: "Use weight, infection and exact formulation; do not exceed the verified product maximum." },
    ],
    commonSideEffects: ["Nausea", "Abdominal pain or cramps", "Diarrhoea", "Vomiting"],
    urgentCare: ["Breathing difficulty or facial/throat swelling", "Fainting, marked palpitations or new irregular heartbeat", "Severe or persistent diarrhoea, especially with blood", "Blistering or widespread rash", "Jaundice or dark urine"],
    interactions: [
      { medicineOrClass: "QT-prolonging medicines", risk: "Additive cardiac rhythm risk", action: "Check the full list and escalate clinically significant combinations." },
      { medicineOrClass: "CYP3A4 substrates/inhibitors, including some statins", risk: "Raised concentrations and toxicity", action: "Use the exact product PI and interaction checker; contact prescriber if unresolved." },
      { medicineOrClass: "Warfarin", risk: "INR/bleeding effect may increase", action: "Confirm monitoring plan." },
    ],
  },
  warfarin: {
    warningLabels: [
      { code: "K / BT", label: "Regular blood tests required", appliesWhen: "All warfarin therapy.", rationale: "Dose is individualised to INR and indication." },
      { code: "O / ASP", label: "Do not take aspirin/NSAIDs without advice", appliesWhen: "All warfarin therapy unless specifically co-prescribed and monitored.", rationale: "These products can substantially increase bleeding risk." },
      { code: "F / ALC", label: "Avoid alcohol", appliesWhen: "Use the local label set and patient-specific plan; avoid binge or unstable intake.", rationale: "Alcohol can destabilise anticoagulation and increase bleeding/fall risk." },
    ],
    dosing: [
      { population: "Adults", indication: "Initiation", productInformationDose: "Individualised initiation is commonly 2–5 mg daily with early INR testing.", notes: "Use a validated local protocol; age, frailty, liver disease and interactions often require lower doses." },
      { population: "Adults", indication: "Maintenance", productInformationDose: "No fixed dose; titrate to the indication-specific INR target.", notes: "The same tablet strength can represent very different weekly schedules." },
      { population: "Children", indication: "Any anticoagulation indication", productInformationDose: "Specialist-only, weight- and INR-guided dosing.", notes: "Do not extrapolate an adult starting dose." },
    ],
    commonSideEffects: ["Easy bruising", "Longer bleeding from cuts", "Minor nose or gum bleeding"],
    urgentCare: ["Bleeding that will not stop", "Black stools, vomiting blood or blood in urine", "Sudden severe headache, weakness, speech change or collapse", "Significant head injury even without immediate symptoms"],
    interactions: [
      { medicineOrClass: "NSAIDs, aspirin and antiplatelets", risk: "Major bleeding", action: "Avoid unless specifically prescribed with a documented plan." },
      { medicineOrClass: "Many antibiotics/antifungals and amiodarone", risk: "INR may rise or fall", action: "Check interaction and arrange extra INR monitoring as indicated." },
      { medicineOrClass: "Vitamin K intake and complementary products", risk: "Unstable anticoagulation", action: "Keep diet consistent and check supplements before use." },
    ],
  },
  amoxicillin: {
    warningLabels: [
      { code: "A / SW", label: "Shake well before use", appliesWhen: "All reconstituted suspensions.", rationale: "Ensures a uniform dose." },
      { code: "C / 30AC", label: "Keep refrigerated", appliesWhen: "Only when the exact reconstituted product PI/label requires refrigeration.", rationale: "Storage and in-use shelf life are product-specific." },
      { code: "5 / L5", label: "Complete the full course", appliesWhen: "A defined antibacterial course.", rationale: "Supports the prescribed duration." },
    ],
    dosing: [
      { population: "Adults and children ≥40 kg", indication: "Common susceptible infections", productInformationDose: "Common PI regimens include 250–500 mg every 8 hours or 500–875 mg every 12 hours.", notes: "Infection severity, site and renal function change the regimen." },
      { population: "Children <40 kg", indication: "Common susceptible infections", productInformationDose: "Common PI range: 20–90 mg/kg/day divided into 2 or 3 doses.", notes: "Use current weight, indication, severity, concentration and maximum." },
      { population: "All ages", indication: "Renal impairment", productInformationDose: "Dose or interval may require adjustment.", notes: "Use current renal guidance and exact product PI." },
    ],
    commonSideEffects: ["Nausea", "Diarrhoea", "Mild rash", "Oral or vaginal thrush"],
    urgentCare: ["Breathing difficulty, facial/throat swelling or collapse", "Blistering or peeling rash", "Severe or bloody diarrhoea", "New jaundice or dark urine"],
    interactions: [
      { medicineOrClass: "Warfarin", risk: "Anticoagulant effect may change", action: "Confirm INR monitoring." },
      { medicineOrClass: "Methotrexate", risk: "Methotrexate toxicity may increase", action: "Escalate for clinical review." },
      { medicineOrClass: "Allopurinol", risk: "Rash risk may increase", action: "Check indication and counsel/monitor." },
    ],
  },
  temazepam: {
    warningLabels: [
      { code: "E / UAD", label: "May cause drowsiness", appliesWhen: "All supplies.", rationale: "Sedation and impaired coordination are expected risks." },
      { code: "F / ALC", label: "Avoid alcohol", appliesWhen: "All supplies.", rationale: "Additive sedation and respiratory impairment." },
      { code: "G / DRV", label: "Avoid driving/machinery", appliesWhen: "Until individual effects and next-day impairment are known.", rationale: "Psychomotor impairment may persist." },
      { code: "N / STP", label: "Do not stop suddenly", appliesWhen: "Regular or prolonged use.", rationale: "Abrupt withdrawal can cause rebound symptoms and withdrawal." },
    ],
    dosing: [
      { population: "Adults", indication: "Short-term insomnia", productInformationDose: "Common PI dose: 10–20 mg at bedtime.", notes: "Use the lowest effective dose for the shortest duration." },
      { population: "Older or debilitated adults", indication: "Short-term insomnia", productInformationDose: "Common PI starting dose: 10 mg at bedtime.", notes: "Higher fall, confusion and next-day impairment risk." },
      { population: "Children", indication: "Insomnia", productInformationDose: "Not routinely recommended; safety/effectiveness not established for general paediatric use.", notes: "Specialist review required." },
    ],
    commonSideEffects: ["Drowsiness", "Dizziness", "Impaired coordination", "Memory problems", "Next-day fatigue"],
    urgentCare: ["Slow or difficult breathing", "Extreme sleepiness or inability to wake", "Severe confusion, agitation or unusual behaviour", "Fall or head injury"],
    interactions: [
      { medicineOrClass: "Alcohol, opioids and other sedatives", risk: "Profound sedation, respiratory depression, coma", action: "Avoid/hold and escalate unsafe combinations." },
      { medicineOrClass: "Sedating antihistamines, antipsychotics and some antidepressants", risk: "Additive impairment and falls", action: "Review total sedative burden." },
    ],
  },
  metformin: {
    warningLabels: [
      { code: "18 / L18", label: "Take with food or milk", appliesWhen: "Oral metformin, immediate- and modified-release.", rationale: "Reduces gastrointestinal intolerance." },
      { code: "K / BT", label: "Regular blood tests required", appliesWhen: "All ongoing therapy.", rationale: "Renal function, glycaemic control and sometimes vitamin B12 require monitoring." },
      { code: "P / WHO", label: "Swallow whole — do not crush or chew", appliesWhen: "Modified- and extended-release products only (for example Metex XR, Diabex XR).", rationale: "Crushing an extended-release matrix releases the dose at once. Do not apply this label to immediate-release metformin." },
    ],
    dosing: [
      { population: "Adults", indication: "Type 2 diabetes — immediate release", productInformationDose: "Common PI start: 500 mg once or twice daily with meals, titrated gradually; product maximum may be up to 3 g/day in divided doses.", notes: "Use the exact product, tolerability and renal function." },
      { population: "Children ≥10 years", indication: "Type 2 diabetes", productInformationDose: "Common PI start: 500 mg once daily with food; titrate, commonly to a maximum of 2 g/day.", notes: "Confirm age approval for the exact product." },
      { population: "Older adults or renal impairment", indication: "Type 2 diabetes", productInformationDose: "No automatic age dose; select/titrate from renal function and tolerability.", notes: "Contraindicated at severe renal impairment thresholds in the current PI; reassess during acute illness." },
    ],
    commonSideEffects: ["Nausea", "Diarrhoea", "Abdominal discomfort", "Reduced appetite", "Metallic taste"],
    urgentCare: ["Marked weakness, unusual sleepiness or breathing difficulty during acute illness", "Persistent vomiting or severe dehydration", "Severe abdominal symptoms with systemic illness", "Possible allergy"],
    interactions: [
      { medicineOrClass: "Cimetidine and other renal cation transport competitors", risk: "Metformin exposure may rise", action: "Review renal function and clinical significance with prescriber." },
      { medicineOrClass: "Iodinated contrast", risk: "Acute kidney injury can increase lactic-acidosis risk", action: "Follow current contrast procedure/sick-day guidance." },
      { medicineOrClass: "Alcohol excess", risk: "Lactic-acidosis and hypoglycaemia risk", action: "Avoid excessive intake and counsel on acute illness." },
    ],
  },
  doxycycline: {
    warningLabels: [
      { code: "I / WTR", label: "Take with a full glass of water", appliesWhen: "Oral tablets/capsules.", rationale: "Reduces oesophageal injury." },
      { code: "L / LYD", label: "Do not lie down for 30 min after taking", appliesWhen: "Oral tablets/capsules.", rationale: "Reduces oesophageal irritation/ulceration." },
      { code: "M / DAI", label: "Avoid dairy/antacids within 2 hours", appliesWhen: "When the selected product/interacting cation requires separation.", rationale: "Calcium, magnesium, aluminium, iron and zinc can reduce absorption." },
      { code: "H / SUN", label: "Avoid sunlight / use sunscreen", appliesWhen: "All systemic doxycycline courses.", rationale: "Photosensitivity can occur." },
      { code: "5 / L5", label: "Complete the full course", appliesWhen: "A defined antibacterial course, not every long-term indication.", rationale: "Supports prescribed duration." },
    ],
    dosing: [
      { population: "Adults", indication: "Acute susceptible infection", productInformationDose: "Common PI regimen: 200 mg on day 1, then 100 mg daily; severe infections may use 100 mg twice daily.", notes: "Indication-specific regimens differ." },
      { population: "Adults", indication: "Acne/rosacea or other long-term indication", productInformationDose: "Often 50–100 mg daily depending on product and indication.", notes: "Do not apply antibiotic-course language automatically." },
      { population: "Children ≥8 years and <50 kg", indication: "Selected serious infections", productInformationDose: "Common PI approach: 4 mg/kg on day 1 then 2 mg/kg/day; severe infection may use 4 mg/kg/day.", notes: "Specialist/indication review; age restrictions and maximums apply." },
    ],
    commonSideEffects: ["Nausea", "Abdominal discomfort", "Diarrhoea", "Headache", "Photosensitivity"],
    urgentCare: ["Painful swallowing or severe chest pain after a dose", "Breathing difficulty or facial/throat swelling", "Severe headache with visual disturbance", "Blistering rash", "Severe or bloody diarrhoea"],
    interactions: [
      { medicineOrClass: "Antacids, iron, calcium, magnesium, zinc and multivitamins", risk: "Reduced doxycycline absorption", action: "Separate using the exact product PI interval." },
      { medicineOrClass: "Warfarin", risk: "Anticoagulant effect may increase", action: "Confirm INR/bleeding monitoring." },
      { medicineOrClass: "Oral retinoids", risk: "Intracranial-hypertension risk", action: "Avoid combination and escalate." },
    ],
  },
  oxycodone: {
    warningLabels: [
      { code: "E / UAD", label: "May cause drowsiness", appliesWhen: "All oral oxycodone products.", rationale: "Sedation and impaired reaction time can occur." },
      { code: "F / ALC", label: "Avoid alcohol", appliesWhen: "All supplies.", rationale: "Additive sedation and respiratory depression." },
      { code: "G / DRV", label: "Avoid driving/machinery", appliesWhen: "When starting/changing dose or if impaired.", rationale: "Opioids impair psychomotor performance." },
      { code: "P / WHO", label: "Swallow whole — do not crush or chew", appliesWhen: "Modified-release tablets.", rationale: "Manipulation can release a potentially fatal dose." },
      { code: "Q / SEC", label: "Keep locked away and out of reach", appliesWhen: "All opioid supplies.", rationale: "Prevents accidental ingestion, diversion and child exposure." },
    ],
    dosing: [
      { population: "Adults already opioid-tolerant", indication: "Severe chronic pain", productInformationDose: "Individualise from current opioid exposure; OxyContin is normally dosed every 12 hours.", notes: "Use a verified conversion and specialist plan; case dose is 20 mg every 12 hours for an established patient." },
      { population: "Opioid-naive adults", indication: "Severe pain requiring modified-release opioid", productInformationDose: "Some PIs describe 10 mg every 12 hours as a low starting dose, but initiation requires careful selection and review.", notes: "Do not infer suitability from age alone; assess respiratory and sedative risks." },
      { population: "Children", indication: "Pain", productInformationDose: "Not a routine community initiation; specialist paediatric dosing only where the exact product is approved.", notes: "Do not extrapolate adult doses." },
    ],
    commonSideEffects: ["Constipation", "Nausea", "Drowsiness", "Dizziness", "Itching"],
    urgentCare: ["Slow, shallow or difficult breathing", "Blue lips, collapse or inability to wake", "Severe confusion", "Suspected accidental ingestion or overdose"],
    interactions: [
      { medicineOrClass: "Benzodiazepines, alcohol, gabapentinoids and other sedatives", risk: "Profound sedation and fatal respiratory depression", action: "Review total sedative burden; avoid unsafe combinations." },
      { medicineOrClass: "Strong CYP3A4 inhibitors/inducers", risk: "Oxycodone concentration may change", action: "Check exact interaction and monitor/escalate." },
      { medicineOrClass: "MAO inhibitors", risk: "Serious interaction", action: "Check recent use and seek specialist advice." },
    ],
  },
  fentanyl: {
    warningLabels: [
      { code: "E / UAD", label: "May cause drowsiness", appliesWhen: "All transdermal fentanyl supplies.", rationale: "Potent opioid sedation." },
      { code: "F / ALC", label: "Avoid alcohol", appliesWhen: "All supplies.", rationale: "Fatal additive respiratory depression is possible." },
      { code: "G / DRV", label: "Avoid driving/machinery", appliesWhen: "When starting/changing dose or if impaired.", rationale: "Psychomotor impairment." },
      { code: "R / HTP", label: "Avoid heat on the patch", appliesWhen: "All patches.", rationale: "External heat and fever can increase fentanyl absorption." },
      { code: "S / ROP", label: "Remove old patch before applying a new one", appliesWhen: "Every patch change.", rationale: "Prevents unintentional dose stacking." },
      { code: "Q / SEC", label: "Keep locked away and out of reach", appliesWhen: "Used and unused patches.", rationale: "Used patches retain enough fentanyl to cause fatal exposure." },
    ],
    dosing: [
      { population: "Opioid-tolerant adults", indication: "Severe chronic pain", productInformationDose: "Select initial patch from a verified current oral-opioid conversion; change at the product-specified interval, commonly 72 hours.", notes: "Not interchangeable microgram-for-milligram; monitor after initiation and changes." },
      { population: "Opioid-naive patients", indication: "Pain", productInformationDose: "Do not initiate the 25 microgram/hour patch in an opioid-naive patient.", notes: "Risk of fatal respiratory depression; contact prescriber." },
      { population: "Children ≥2 years who are opioid-tolerant", indication: "Severe chronic pain", productInformationDose: "Specialist conversion from established opioid exposure only.", notes: "Not for opioid-naive children; exact age/product restrictions apply." },
    ],
    commonSideEffects: ["Constipation", "Nausea", "Drowsiness", "Dizziness", "Application-site irritation"],
    urgentCare: ["Slow or difficult breathing", "Inability to wake, blue lips or collapse", "Patch stuck to another person or swallowed", "Severe confusion or suspected overdose"],
    interactions: [
      { medicineOrClass: "Alcohol, benzodiazepines and other CNS depressants", risk: "Fatal sedation and respiratory depression", action: "Avoid unsafe combinations and provide overdose plan." },
      { medicineOrClass: "Strong CYP3A4 inhibitors/inducers", risk: "Fentanyl exposure may rise or fall", action: "Check and monitor closely or escalate." },
      { medicineOrClass: "Heat sources and fever", risk: "Accelerated absorption and overdose", action: "Avoid heating pads/hot baths over patch; seek advice for significant fever." },
    ],
  },
  dexamfetamine: {
    warningLabels: [
      { code: "Q / SEC", label: "Keep locked away and out of reach", appliesWhen: "All Schedule 8 psychostimulant supplies.", rationale: "Prevents diversion and accidental ingestion." },
      { code: "G / DRV", label: "Avoid driving/machinery", appliesWhen: "If dizziness, visual change or impaired judgment occurs.", rationale: "Individual CNS effects vary." },
    ],
    dosing: [
      { population: "Children 3–5 years", indication: "ADHD", productInformationDose: "Common PI start: 2.5 mg daily, increased cautiously at weekly intervals.", notes: "Specialist diagnosis/oversight and jurisdictional requirements apply." },
      { population: "Children ≥6 years and adolescents", indication: "ADHD", productInformationDose: "Common PI start: 5 mg once or twice daily; increase gradually. Doses above 40 mg/day are rarely necessary.", notes: "Give earlier in the day; monitor growth, appetite, sleep, BP and pulse." },
      { population: "Adults", indication: "Narcolepsy", productInformationDose: "Common PI range: 5–60 mg/day in divided doses.", notes: "ADHD adult use and approval vary; verify exact indication and specialist plan." },
    ],
    commonSideEffects: ["Reduced appetite", "Insomnia", "Dry mouth", "Abdominal discomfort", "Headache", "Increased heart rate"],
    urgentCare: ["Chest pain, fainting or marked palpitations", "Severe agitation, hallucinations or mania", "Seizure", "Cold, painful or colour-changing fingers/toes"],
    interactions: [
      { medicineOrClass: "MAO inhibitors", risk: "Hypertensive crisis and serious toxicity", action: "Contraindicated with recent use; stop and escalate." },
      { medicineOrClass: "Other stimulants and sympathomimetics, including some decongestants", risk: "Additive cardiovascular/CNS effects", action: "Reconcile OTC products and monitor/escalate." },
      { medicineOrClass: "Urinary pH-altering products", risk: "Dexamfetamine exposure can change", action: "Check product information when clinically relevant." },
    ],
  },
  methotrexate: {
    warningLabels: [
      { code: "T / WKY", label: "Take once weekly on the same day", appliesWhen: "Low-dose methotrexate for inflammatory disease.", rationale: "Daily administration errors can be fatal." },
      { code: "K / BT", label: "Regular blood tests required", appliesWhen: "All long-term low-dose therapy.", rationale: "FBC, liver and renal monitoring detect toxicity." },
      { code: "O / ASP", label: "Do not take aspirin/NSAIDs without advice", appliesWhen: "All supplies unless a prescriber has reviewed the combination.", rationale: "Toxicity and renal risk can increase." },
    ],
    dosing: [
      { population: "Adults", indication: "Rheumatoid arthritis", productInformationDose: "Common PI start: 7.5 mg once weekly; titrate to response and monitoring, with product-specific maximums.", notes: "Never daily for this indication. Record the weekly day prominently." },
      { population: "Adults", indication: "Severe psoriasis", productInformationDose: "Common PI range: 10–25 mg once weekly after a test/assessment strategy where specified.", notes: "Specialist oversight and monitoring required." },
      { population: "Children", indication: "Juvenile inflammatory disease", productInformationDose: "Specialist weight/body-surface-area weekly regimen only.", notes: "Use paediatric specialist reference; do not extrapolate adult tablets." },
    ],
    commonSideEffects: ["Nausea", "Reduced appetite", "Fatigue", "Mouth soreness", "Mild hair thinning"],
    urgentCare: ["Fever or signs of infection", "Mouth ulcers or severe sore throat", "Unusual bruising or bleeding", "Shortness of breath or persistent cough", "Severe rash, jaundice or marked vomiting"],
    interactions: [
      { medicineOrClass: "Trimethoprim or trimethoprim-sulfamethoxazole", risk: "Severe bone-marrow suppression", action: "Avoid and urgently clarify." },
      { medicineOrClass: "NSAIDs, penicillins and other medicines affecting renal clearance", risk: "Methotrexate exposure/toxicity may increase", action: "Assess dose, renal function and monitoring; contact prescriber if unresolved." },
      { medicineOrClass: "Live vaccines and alcohol excess", risk: "Infection or liver toxicity", action: "Check immunisation and alcohol plan with treating team." },
    ],
  },
  lithium: {
    warningLabels: [
      { code: "K / BT", label: "Regular blood tests required", appliesWhen: "All lithium therapy.", rationale: "Serum concentration, renal, thyroid and calcium monitoring are essential." },
      { code: "O / ASP", label: "Do not take aspirin/NSAIDs without advice", appliesWhen: "All supplies.", rationale: "NSAIDs can raise lithium concentrations." },
      { code: "U / FLS", label: "Maintain normal fluid and salt intake", appliesWhen: "All supplies.", rationale: "Dehydration or major sodium change can precipitate toxicity." },
      { code: "P / WHO", label: "Swallow whole — do not crush or chew", appliesWhen: "Sustained-release tablets such as Quilonum SR.", rationale: "Preserves the release profile." },
    ],
    dosing: [
      { population: "Adults", indication: "Acute mania", productInformationDose: "Common PI total: approximately 900–1800 mg/day in divided doses, adjusted to serum concentration and response.", notes: "Product, formulation and target concentration vary; frequent early levels required." },
      { population: "Adults", indication: "Maintenance", productInformationDose: "Often approximately 900–1200 mg/day in divided doses, but entirely concentration-guided.", notes: "Some patients require much lower or higher doses." },
      { population: "Older adults or renal impairment", indication: "Any", productInformationDose: "Use lower individualised doses and closer monitoring.", notes: "No safe age-only dose; renal function and interacting medicines dominate." },
    ],
    commonSideEffects: ["Fine tremor", "Thirst", "Increased urination", "Nausea", "Mild diarrhoea", "Weight gain"],
    urgentCare: ["Worsening/coarse tremor", "Persistent vomiting or diarrhoea", "Unsteady walking, slurred speech or confusion", "Marked drowsiness, muscle jerks or seizure"],
    interactions: [
      { medicineOrClass: "NSAIDs", risk: "Lithium concentration and toxicity may increase", action: "Avoid self-treatment; arrange level/clinical review when combined." },
      { medicineOrClass: "ACE inhibitors, ARBs and thiazide diuretics", risk: "Lithium concentration may rise substantially", action: "Only combine with a documented monitoring/dose plan." },
      { medicineOrClass: "Dehydration or sudden low-salt intake", risk: "Lithium retention and toxicity", action: "Use sick-day escalation plan and seek prompt advice." },
    ],
  },
  sitagliptin: {
    warningLabels: [
      { code: "D / UAF", label: "May cause nausea", appliesWhen: "Oral sitagliptin products.", rationale: "Gastrointestinal upset is reported, particularly early in therapy." },
    ],
    dosing: [
      { population: "Adults", indication: "Type 2 diabetes", productInformationDose: "100 mg once daily.", notes: "Taken with or without food. Confirm against the current PI." },
      { population: "Adults with renal impairment", indication: "Type 2 diabetes", productInformationDose: "Reduced doses (commonly 50 mg or 25 mg once daily) apply as renal function falls.", notes: "Dose depends on the measured eGFR/creatinine clearance band in the current PI — check before supply." },
      { population: "Children", indication: "Any", productInformationDose: "Not established for routine paediatric use in the Australian PI.", notes: "Do not extrapolate the adult dose." },
    ],
    commonSideEffects: ["Headache", "Nausea", "Upper respiratory tract infection", "Nasopharyngitis"],
    urgentCare: ["Severe, persistent abdominal pain that may radiate to the back (possible pancreatitis)", "Blistering or peeling rash, or swelling of the face, lips or throat", "Severe or persistent joint pain", "Symptoms of hypoglycaemia that do not resolve with treatment"],
    interactions: [
      { medicineOrClass: "Sulfonylureas and insulin", risk: "Hypoglycaemia risk increases", action: "Expect a prescriber to consider lowering the sulfonylurea or insulin dose; counsel on hypoglycaemia recognition and treatment." },
      { medicineOrClass: "Other DPP-4 inhibitors or fixed-dose combinations containing sitagliptin", risk: "Therapeutic duplication", action: "Check the patient is not already supplied a gliptin, including combination products such as Janumet." },
      { medicineOrClass: "Digoxin", risk: "Small increase in digoxin exposure reported", action: "Check the current PI; monitoring may be appropriate for patients already at risk." },
    ],
  },
  apixaban: {
    warningLabels: [
      { code: "N / STP", label: "Do not stop suddenly", appliesWhen: "All anticoagulation indications unless a clinician directs interruption.", rationale: "Premature discontinuation increases thrombosis/stroke risk." },
      { code: "O / ASP", label: "Do not take aspirin/NSAIDs without advice", appliesWhen: "All supplies.", rationale: "Bleeding risk increases." },
      { code: "V / BLD", label: "Report unusual bleeding urgently", appliesWhen: "All supplies.", rationale: "Supports early recognition of significant bleeding." },
    ],
    dosing: [
      { population: "Adults", indication: "Non-valvular atrial fibrillation", productInformationDose: "5 mg twice daily; reduce to 2.5 mg twice daily when at least 2 apply: age ≥80 years, weight ≤60 kg, serum creatinine ≥133 micromol/L.", notes: "Check current PI and severe renal-impairment guidance." },
      { population: "Adults", indication: "Acute DVT or PE", productInformationDose: "10 mg twice daily for 7 days, then 5 mg twice daily.", notes: "Confirm indication and treatment phase." },
      { population: "Adults", indication: "Prevention of recurrent DVT/PE", productInformationDose: "2.5 mg twice daily after at least 6 months of treatment.", notes: "Do not use the AF reduction rule for this indication." },
      { population: "Adults", indication: "VTE prevention after hip/knee replacement", productInformationDose: "2.5 mg twice daily for the product/operation-specific duration.", notes: "Timing after surgery and duration differ by procedure." },
      { population: "Children", indication: "Any", productInformationDose: "Use only if the current Australian PI specifically approves the age/indication and a specialist plan is documented.", notes: "Do not extrapolate adult regimens." },
    ],
    commonSideEffects: ["Bruising", "Nosebleed", "Minor bleeding", "Nausea", "Anaemia"],
    urgentCare: ["Bleeding that will not stop", "Black stools, vomiting blood or blood in urine", "Sudden severe headache, weakness, speech change or collapse", "Significant head injury"],
    interactions: [
      { medicineOrClass: "NSAIDs, aspirin and antiplatelets", risk: "Bleeding risk increases", action: "Avoid unless specifically reviewed and co-prescribed." },
      { medicineOrClass: "Strong dual CYP3A4/P-gp inhibitors or inducers", risk: "Apixaban exposure may rise or fall", action: "Check the exact PI and avoid/adjust only under prescriber direction." },
      { medicineOrClass: "Other anticoagulants", risk: "Major bleeding", action: "Use only during a documented switching/procedural plan." },
    ],
  },
};

export const MEDICINE_LEARNING_PROFILES: MedicineLearningProfile[] = [
  ...BASE_MEDICINE_LEARNING_PROFILES,
  ...COMPLEX_MEDICINE_PROFILES,
].map((profile) => ({
  ...profile,
  clinicalGuide: CLINICAL_GUIDES[profile.id],
}));

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
      // Match whole words, not substrings: a product name like "JANUVIA TAB
      // 100MG" must not score against "mood s(tab)iliser".
      const haystackWords = new Set(
        normalizeMedicineQuery(
          [profile.genericName, profile.medicineClass, ...profile.aliases].join(" ")
        ).split(/\s+/).filter(Boolean)
      );
      const matchingTokens = tokens.filter((token) => haystackWords.has(token)).length;
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
