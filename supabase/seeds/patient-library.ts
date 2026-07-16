// All patients are fictional. Data is used for dispensing practice only.

export interface SeedPatient {
  seed_id: string;
  surname: string;
  firstname: string;
  title: string;
  sex: string;
  date_of_birth: string;   // stored as text (e.g. "1965-03-14")
  address: string;
  suburb: string;
  postcode: string;
  phone: string;
  medicare_card: string;
  medicare_valid_to: string;
  concession_type: string | null;
  concession_number: string | null;
  allergies: string[];
  patient_notes: string | null;
}

// ── Random patient generation ─────────────────────────────────────────────────

const SURNAMES = [
  "SMITH", "JONES", "BROWN", "WILSON", "TAYLOR", "JOHNSON", "WHITE", "LEE",
  "MARTIN", "ANDERSON", "THOMPSON", "GARCIA", "CLARK", "WALKER", "HALL",
  "YOUNG", "KING", "WRIGHT", "LOPEZ", "HILL", "GREEN", "ADAMS", "BAKER",
  "CAMPBELL", "NELSON", "MITCHELL", "ROBERTS", "CARTER", "PHILLIPS", "EVANS",
  "TURNER", "DIAZ", "PARKER", "EDWARDS", "COLLINS", "STEWART", "MORRIS",
  "ROGERS", "REED", "COOK", "BAILEY", "RIVERA", "COOPER", "RICHARDSON", "COX",
  "HOWARD", "WARD", "TORRES", "PETERSON", "GRAY",
  "NGUYEN", "PATEL", "WANG", "LI", "KHAN", "SINGH", "KUMAR", "SHARMA",
  "CHEN", "ZHANG", "KIM", "TRAN", "LE",
];

const FIRSTNAMES_M = [
  "JAMES", "JOHN", "MICHAEL", "DAVID", "ANDREW", "ROBERT", "PETER", "CHRIS",
  "DANIEL", "MATTHEW", "MARK", "PAUL", "TOM", "BEN", "ALEX", "NICK",
  "SAM", "JACK", "LUKE", "RYAN", "JASON", "KEVIN", "STEVE", "SIMON",
  "ANTHONY", "ADAM", "AARON", "NATHAN", "JOSH", "JAKE",
];

const FIRSTNAMES_F = [
  "SARAH", "EMMA", "JESSICA", "ANNA", "REBECCA", "MICHELLE", "NICOLE",
  "EMILY", "RACHEL", "AMANDA", "LISA", "KATE", "MELISSA", "JULIA",
  "LAURA", "AMY", "HANNAH", "OLIVIA", "SOPHIE", "CHLOE", "GRACE",
  "CHARLOTTE", "ELLA", "ZOE", "MIA", "ISABELLA", "AVA", "LILY",
  "RUBY", "GEORGIA",
];

const STREETS = [
  "SMITH ST", "MAIN RD", "KING ST", "VICTORIA RD", "GEORGE ST",
  "CHURCH ST", "PARK AVE", "HIGH ST", "STATION RD", "QUEEN ST",
  "OXFORD ST", "ELIZABETH ST", "WILLIAM ST", "CLARENCE ST", "BRIDGE RD",
  "ALBERT ST", "CHAPEL ST", "BAY RD", "HILL ST", "RIVER RD",
];

// suburb + matching postcode tuples
const SUBURBS: [string, string][] = [
  ["ABBOTSFORD", "3067"], ["CARLTON", "3053"], ["FITZROY", "3065"], ["RICHMOND", "3121"],
  ["KENSINGTON", "5068"], ["NORWOOD", "5067"], ["UNLEY", "5061"], ["GLENELG", "5045"],
  ["NEWTOWN", "2042"], ["BONDI", "2026"], ["PARRAMATTA", "2150"], ["MANLY", "2095"],
  ["ST LUCIA", "4067"], ["TOOWONG", "4066"], ["PADDINGTON", "4064"],
  ["SOUTH PERTH", "6151"], ["FREMANTLE", "6160"],
];

const AREA_CODES = ["02", "03", "07", "08"];

/** Deterministic LCG — same inputs always yield the same output. */
function seededInt(seed: number, max: number): number {
  const h = ((seed * 1664525 + 1013904223) >>> 0);
  return h % max;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seededInt(seed, arr.length)];
}

function generateAddress(base: number): string {
  const num = 1 + seededInt(base, 99);
  const street = pick(STREETS, base + 1);
  return `${num} ${street}`;
}

function generatePhone(base: number): string {
  const area = pick(AREA_CODES, base + 4);
  const a = String(1000 + seededInt(base + 5, 9000));
  const b = String(1000 + seededInt(base + 6, 9000));
  return `(${area}) ${a} ${b}`;
}

function generateMedicare(base: number): string {
  const p1 = String(2000 + seededInt(base + 10, 8000));
  const p2 = String(10000 + seededInt(base + 11, 89999));
  const p3 = 1 + seededInt(base + 12, 9);
  return `${p1}-${p2}-${p3}`;
}

function generateDob(base: number): string {
  const year = 1940 + seededInt(base + 20, 70);
  const month = 1 + seededInt(base + 21, 12);
  const day = 1 + seededInt(base + 22, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function generateConcession(base: number): string {
  const types = ["C", "S", "P"];
  const t = pick(types, base + 30);
  const n1 = String(400 + seededInt(base + 31, 600)).padStart(3, "0");
  const n2 = String(seededInt(base + 32, 999)).padStart(3, "0");
  const n3 = String(seededInt(base + 33, 999)).padStart(3, "0");
  const ch = String.fromCharCode(65 + seededInt(base + 34, 26));
  return `${t} ${n1} ${n2} ${n3}${ch}`;
}

function generateRandomPatients(): SeedPatient[] {
  const patients: SeedPatient[] = [];

  SURNAMES.forEach((surname, i) => {
    const count = 2 + (i % 3); // 2, 3, or 4 per surname
    for (let n = 0; n < count; n++) {
      const base = i * 100 + n * 7; // unique per patient, no collisions
      const isMale = n % 2 === 0;
      const firstname = isMale
        ? pick(FIRSTNAMES_M, base)
        : pick(FIRSTNAMES_F, base);
      const [suburb, postcode] = pick(SUBURBS, base + 3) as [string, string];
      const isConc = seededInt(base + 40, 3) === 0;

      patients.push({
        seed_id: `random-${surname.toLowerCase()}-${n}`,
        surname,
        firstname,
        title: isMale ? "MR" : "MRS",
        sex: isMale ? "M" : "F",
        date_of_birth: generateDob(base),
        address: generateAddress(base),
        suburb,
        postcode,
        phone: generatePhone(base),
        medicare_card: generateMedicare(base),
        medicare_valid_to: "12/28",
        concession_type: isConc ? "C" : null,
        concession_number: isConc ? generateConcession(base) : null,
        allergies: [],
        patient_notes: null,
      });
    }
  });

  return patients;
}

export const RANDOM_PATIENTS: SeedPatient[] = generateRandomPatients();

// ── Fixture patients (used by specific cases — keep UNCHANGED) ────────────────

export const SEED_PATIENTS: SeedPatient[] = [
  // ── CARRUTHERS cluster (2) — Case 13's correct patient + 1 decoy ────
  {
    seed_id: "patient-christopher-carruthers-adelaide",
    surname: "CARRUTHERS", firstname: "CHRISTOPHER", title: "MR", sex: "M",
    date_of_birth: "1978-01-08",
    address: "173 OAKENDON STREET", suburb: "ADELAIDE", postcode: "5000",
    phone: "(08) 8211 4477",
    medicare_card: "3656-55648-8", medicare_valid_to: "12/2028",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: "Type 2 diabetes — metformin XR and sitagliptin",
  },
  {
    seed_id: "patient-christine-carruthers-adelaide",
    surname: "CARRUTHERS", firstname: "CHRISTINE", title: "MS", sex: "F",
    date_of_birth: "1981-06-23",
    address: "173 OAKENDON STREET", suburb: "ADELAIDE", postcode: "5000",
    phone: "(08) 8211 4477",
    medicare_card: "3656-55648-9", medicare_valid_to: "12/2028",
    concession_type: null, concession_number: null,
    allergies: ["METFORMIN (severe GI upset)"],
    patient_notes: null,
  },
  // ── SMITH cluster (4) — Case 1's correct patient + 3 decoys ─────────
  {
    seed_id: "patient-john-smith-abbotsford",
    surname: "SMITH", firstname: "JOHN", title: "MR", sex: "M",
    date_of_birth: "1965-03-14",
    address: "20 TRENERRY CRESCENT", suburb: "ABBOTSFORD", postcode: "3067",
    phone: "(03) 9417 2211",
    medicare_card: "3333-00000-11", medicare_valid_to: "11/2020",
    concession_type: null, concession_number: null,
    allergies: ["PENICILLIN (rash)"],
    patient_notes: "Hypertension — on Amlodipine 5mg od",
  },
  {
    seed_id: "patient-john-smith-richmond",
    surname: "SMITH", firstname: "JOHN", title: "MR", sex: "M",
    date_of_birth: "1978-11-02",
    address: "15 BRIDGE ROAD", suburb: "RICHMOND", postcode: "3121",
    phone: "(03) 9428 5599",
    medicare_card: "3412-56789-2", medicare_valid_to: "08/2023",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-jane-smith-fitzroy",
    surname: "SMITH", firstname: "JANE", title: "MS", sex: "F",
    date_of_birth: "1990-07-25",
    address: "88 GERTRUDE STREET", suburb: "FITZROY", postcode: "3065",
    phone: "(03) 9419 3344",
    medicare_card: "2987-11234-5", medicare_valid_to: "03/2025",
    concession_type: "C", concession_number: "C 401 234 567A",
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-james-smith-melbourne",
    surname: "SMITH", firstname: "JAMES", title: "MR", sex: "M",
    date_of_birth: "1952-05-18",
    address: "6 COLLINS STREET", suburb: "MELBOURNE", postcode: "3000",
    phone: "(03) 9650 1122",
    medicare_card: "4122-33445-9", medicare_valid_to: "05/2022",
    concession_type: "C", concession_number: "C 402 876 112B",
    allergies: ["NSAIDS (GI bleed)"],
    patient_notes: "Type 2 diabetes",
  },

  // ── HEALTH cluster (4) ─────────────────────────────────────────────────
  {
    seed_id: "patient-fred-health",
    surname: "HEALTH", firstname: "FRED", title: "MR", sex: "M",
    date_of_birth: "1958-01-30",
    address: "27 JAMES STREET", suburb: "ADELAIDE", postcode: "5000",
    phone: "(08) 8211 4455",
    medicare_card: "1234-56789-1", medicare_valid_to: "06/2024",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-frances-health",
    surname: "HEALTH", firstname: "FRANCES", title: "MRS", sex: "F",
    date_of_birth: "1961-09-14",
    address: "27 JAMES STREET", suburb: "ADELAIDE", postcode: "5000",
    phone: "(08) 8211 4455",
    medicare_card: "1234-56789-2", medicare_valid_to: "06/2024",
    concession_type: null, concession_number: null,
    allergies: ["CODEINE (nausea)"],
    patient_notes: null,
  },
  {
    seed_id: "patient-homer-health",
    surname: "HEALTH", firstname: "HOMER", title: "MR", sex: "M",
    date_of_birth: "1966-04-12",
    address: "127 BARKER ROAD", suburb: "PROSPECT", postcode: "5082",
    phone: "(08) 8344 7788",
    medicare_card: "2345-67890-3", medicare_valid_to: "02/2025",
    concession_type: "C", concession_number: "C 501 234 789C",
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-winifred-health",
    surname: "HEALTH", firstname: "WINIFRED", title: "MRS", sex: "F",
    date_of_birth: "1969-11-03",
    address: "127 BARKER ROAD", suburb: "PROSPECT", postcode: "5082",
    phone: "(08) 8344 7788",
    medicare_card: "2345-67890-4", medicare_valid_to: "02/2025",
    concession_type: "S", concession_number: "S 601 234 001D",
    allergies: ["SULFA"],
    patient_notes: null,
  },

  // ── JONES cluster (3) — Case 2's patient + 2 decoys ──────────────────
  {
    seed_id: "patient-margaret-jones-fitzroy",
    surname: "JONES", firstname: "MARGARET", title: "MRS", sex: "F",
    date_of_birth: "1948-06-22",
    address: "44 OAK STREET", suburb: "FITZROY", postcode: "3065",
    phone: "(03) 9417 8899",
    medicare_card: "4444-11111-22", medicare_valid_to: "06/2021",
    concession_type: "C", concession_number: "C 403 211 001E",
    allergies: [],
    patient_notes: "Atrial fibrillation — on warfarin, INR monitored monthly",
  },
  {
    seed_id: "patient-peter-jones-richmond",
    surname: "JONES", firstname: "PETER", title: "MR", sex: "M",
    date_of_birth: "1955-02-14",
    address: "12 ALBERT STREET", suburb: "RICHMOND", postcode: "3121",
    phone: "(03) 9428 6677",
    medicare_card: "5512-34567-3", medicare_valid_to: "04/2022",
    concession_type: null, concession_number: null,
    allergies: ["LATEX"],
    patient_notes: null,
  },
  {
    seed_id: "patient-sarah-jones-carlton",
    surname: "JONES", firstname: "SARAH", title: "MS", sex: "F",
    date_of_birth: "1987-09-06",
    address: "55 LYGON STREET", suburb: "CARLTON", postcode: "3053",
    phone: "(03) 9347 5566",
    medicare_card: "6623-45678-7", medicare_valid_to: "09/2024",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },

  // ── NGUYEN cluster (3) ────────────────────────────────────────────────
  {
    seed_id: "patient-minh-nguyen",
    surname: "NGUYEN", firstname: "MINH", title: "MR", sex: "M",
    date_of_birth: "1980-03-28",
    address: "33 SWANSTON STREET", suburb: "MELBOURNE", postcode: "3000",
    phone: "(03) 9663 1122",
    medicare_card: "7734-56789-1", medicare_valid_to: "12/2023",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-thuy-nguyen",
    surname: "NGUYEN", firstname: "THUY", title: "MS", sex: "F",
    date_of_birth: "1975-12-11",
    address: "77 SYDNEY ROAD", suburb: "BRUNSWICK", postcode: "3056",
    phone: "(03) 9387 4455",
    medicare_card: "8845-67890-2", medicare_valid_to: "07/2025",
    concession_type: "C", concession_number: "C 404 567 002F",
    allergies: ["PENICILLIN (anaphylaxis)"],
    patient_notes: null,
  },
  {
    seed_id: "patient-anh-nguyen",
    surname: "NGUYEN", firstname: "ANH", title: "MRS", sex: "F",
    date_of_birth: "1968-07-04",
    address: "15 HIGH STREET", suburb: "PRAHRAN", postcode: "3181",
    phone: "(03) 9510 2233",
    medicare_card: "9956-78901-3", medicare_valid_to: "03/2023",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },

  // ── PATEL cluster (3) ─────────────────────────────────────────────────
  {
    seed_id: "patient-anita-patel",
    surname: "PATEL", firstname: "ANITA", title: "DR", sex: "F",
    date_of_birth: "1972-05-19",
    address: "22 CHAPEL STREET", suburb: "PRAHRAN", postcode: "3181",
    phone: "(03) 9510 8877",
    medicare_card: "1123-45678-4", medicare_valid_to: "11/2024",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-rajesh-patel",
    surname: "PATEL", firstname: "RAJESH", title: "MR", sex: "M",
    date_of_birth: "1969-08-30",
    address: "90 PUNT ROAD", suburb: "WINDSOR", postcode: "3181",
    phone: "(03) 9521 3344",
    medicare_card: "2234-56789-5", medicare_valid_to: "08/2023",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: "Hypertension, Type 2 diabetes",
  },
  {
    seed_id: "patient-priya-patel",
    surname: "PATEL", firstname: "PRIYA", title: "MRS", sex: "F",
    date_of_birth: "1983-02-16",
    address: "4 SOUTH ROAD", suburb: "KINGSFORD", postcode: "2032",
    phone: "(02) 9663 5566",
    medicare_card: "3345-67890-6", medicare_valid_to: "02/2026",
    concession_type: null, concession_number: null,
    allergies: ["NSAIDS (asthma)"],
    patient_notes: null,
  },

  // ── Singletons for Cases 4 & 5 + extras ──────────────────────────────
  {
    seed_id: "patient-david-park-hawthorn",
    surname: "PARK", firstname: "DAVID", title: "MR", sex: "M",
    date_of_birth: "1971-11-08",
    address: "31 RIVERVIEW RD", suburb: "HAWTHORN", postcode: "3122",
    phone: "(03) 9818 6655",
    medicare_card: "6622-33441-1", medicare_valid_to: "09/2020",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: "Anxiety disorder — on Sertraline. Previous alcohol dependency (in remission).",
  },
  {
    seed_id: "patient-carol-simmons-carlton",
    surname: "SIMMONS", firstname: "CAROL", title: "MRS", sex: "F",
    date_of_birth: "1959-04-23",
    address: "78 LYGON ST", suburb: "CARLTON", postcode: "3053",
    phone: "(03) 9347 2211",
    medicare_card: "7733-44552-3", medicare_valid_to: "04/2023",
    concession_type: null, concession_number: null,
    allergies: ["SULFONAMIDES (anaphylaxis)"],
    patient_notes: "Type 2 diabetes, hypertension, mild CKD (eGFR 58)",
  },
  {
    seed_id: "patient-abebe-tadesse",
    surname: "TADESSE", firstname: "ABEBE", title: "MR", sex: "M",
    date_of_birth: "1985-07-17",
    address: "19 BRUNSWICK ROAD", suburb: "BRUNSWICK", postcode: "3056",
    phone: "(03) 9387 7788",
    medicare_card: "4456-78901-8", medicare_valid_to: "06/2025",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-maria-costa",
    surname: "COSTA", firstname: "MARIA", title: "MRS", sex: "F",
    date_of_birth: "1944-12-03",
    address: "45 FITZROY STREET", suburb: "ST KILDA", postcode: "3182",
    phone: "(03) 9534 3322",
    medicare_card: "5567-89012-9", medicare_valid_to: "12/2022",
    concession_type: "C", concession_number: "C 405 678 003G",
    allergies: ["PENICILLIN (rash)", "CODEINE (confusion)"],
    patient_notes: "Osteoporosis, osteoarthritis",
  },
  {
    seed_id: "patient-olga-petrov",
    surname: "PETROV", firstname: "OLGA", title: "MS", sex: "F",
    date_of_birth: "1976-09-30",
    address: "12 SMITH STREET", suburb: "COLLINGWOOD", postcode: "3066",
    phone: "(03) 9417 9900",
    medicare_card: "6678-90123-7", medicare_valid_to: "09/2024",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-kerry-walsh",
    surname: "WALSH", firstname: "KERRY", title: "MR", sex: "M",
    date_of_birth: "1963-01-19",
    address: "56 MILITARY ROAD", suburb: "NEUTRAL BAY", postcode: "2089",
    phone: "(02) 9953 4411",
    medicare_card: "7789-01234-4", medicare_valid_to: "01/2023",
    concession_type: "S", concession_number: "S 602 345 002H",
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-amy-wong",
    surname: "WONG", firstname: "AMY", title: "MS", sex: "F",
    date_of_birth: "1991-06-05",
    address: "33 OXFORD STREET", suburb: "PADDINGTON", postcode: "2021",
    phone: "(02) 9360 5566",
    medicare_card: "8890-12345-5", medicare_valid_to: "06/2026",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: null,
  },
  {
    seed_id: "patient-peter-morales-richmond",
    surname: "MORALES", firstname: "PETER", title: "MR", sex: "M",
    date_of_birth: "1963-08-19",
    address: "18 BRIDGE ROAD", suburb: "RICHMOND", postcode: "3121",
    phone: "(03) 9000 2207",
    medicare_card: "4928-30177-4", medicare_valid_to: "08/2028",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: "Metastatic prostate cancer. Stable oxycodone modified-release therapy for six months; breakthrough analgesia documented.",
  },
  {
    seed_id: "patient-helen-brooks-kew",
    surname: "BROOKS", firstname: "HELEN", title: "MRS", sex: "F",
    date_of_birth: "1945-02-04",
    address: "6 WALPOLE STREET", suburb: "KEW", postcode: "3101",
    phone: "(03) 9000 2208",
    medicare_card: "5832-11904-2", medicare_valid_to: "02/2028",
    concession_type: "P", concession_number: "P 901 233 008K",
    allergies: [],
    patient_notes: "Osteoarthritis. Opioid-naive; uses paracetamol only. Lives alone.",
  },
  {
    seed_id: "patient-noah-williams-brunswick",
    surname: "WILLIAMS", firstname: "NOAH", title: "MR", sex: "M",
    date_of_birth: "2009-11-11",
    address: "91 SYDNEY ROAD", suburb: "BRUNSWICK", postcode: "3056",
    phone: "(03) 9000 2209",
    medicare_card: "6741-55029-1", medicare_valid_to: "11/2028",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: "ADHD. Dexamfetamine continuation treatment; parent usually collects.",
  },
  {
    seed_id: "patient-grace-lim-box-hill",
    surname: "LIM", firstname: "GRACE", title: "MS", sex: "F",
    date_of_birth: "1967-09-09",
    address: "27 STATION STREET", suburb: "BOX HILL", postcode: "3128",
    phone: "(03) 9000 2210",
    medicare_card: "7250-44810-8", medicare_valid_to: "09/2029",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: "Rheumatoid arthritis. Established weekly methotrexate and folic-acid plan; routine FBC, LFT and renal monitoring.",
  },
  {
    seed_id: "patient-rahul-mehta-footscray",
    surname: "MEHTA", firstname: "RAHUL", title: "MR", sex: "M",
    date_of_birth: "1982-01-29",
    address: "14 PAISLEY STREET", suburb: "FOOTSCRAY", postcode: "3011",
    phone: "(03) 9000 2211",
    medicare_card: "8164-33071-5", medicare_valid_to: "01/2029",
    concession_type: null, concession_number: null,
    allergies: [],
    patient_notes: "Bipolar disorder. Lithium maintenance. Current vomiting and diarrhoea with reduced oral intake; self-started ibuprofen.",
  },
  {
    seed_id: "patient-evelyn-scott-camberwell",
    surname: "SCOTT", firstname: "EVELYN", title: "MRS", sex: "F",
    date_of_birth: "1942-12-02",
    address: "55 BURKE ROAD", suburb: "CAMBERWELL", postcode: "3124",
    phone: "(03) 9000 2212",
    medicare_card: "9073-22581-9", medicare_valid_to: "12/2028",
    concession_type: "P", concession_number: "P 881 240 002S",
    allergies: [],
    patient_notes: "Non-valvular atrial fibrillation. Weight 54 kg, serum creatinine 168 micromol/L, eGFR 22. Uses naproxen most days.",
  },
];

/** Combined pool: 25 fixtures + ~189 random = ~214 total */
export const ALL_PATIENTS: SeedPatient[] = [...SEED_PATIENTS, ...RANDOM_PATIENTS];
