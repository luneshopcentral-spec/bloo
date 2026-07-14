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

export const MEDICINE_LEARNING_PROFILES: MedicineLearningProfile[] = [
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
    aliases: ["metformin an", "biguanide", "diabetes medicine"],
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
