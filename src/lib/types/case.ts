export interface DrugDetails {
  name: string;
  schedule: string;
  pbs: string;
  pbsClass: string;
  claimable: string;
  f2t: string;
  manufacturer: string;
  cost: string;
  retail: string;
  cmi: boolean;
  newDrug: boolean;
  warn1: string;
  warn2: string;
}

export interface ExpectedPatient {
  surname: string;
  firstname: string;
  title?: string;
  sex?: "M" | "F";
  dateOfBirth?: string;    // "DD/MM/YYYY"
  address?: string;        // street only, e.g. "7 MAPLE DRIVE"
  suburb?: string;
  postcode?: string;
  phone?: string;
  medicareCard: string;    // e.g. "5511-22233-1"
  medicareValidTo?: string; // "MM/YYYY"
  concessionType?: string;
  concessionNumber?: string;
  allergies?: string[];
}

export interface PatientLookupSpec {
  requiresNewPatient: boolean;
  // For existing-patient cases: must match the seeded patient's seed_id
  existingPatientSeedId?: string;
  // For new-patient cases: details student must transcribe from the script
  expectedNewPatient?: ExpectedPatient;
  // Patient info as printed on the paper script (fixed regardless of student choice)
  prescriptionPatient: {
    name: string;
    address: string;
    mcare: string;
  };
}

export interface PracticeCase {
  id: string;
  caseNumber: number;
  title: string;
  patientLookup: PatientLookupSpec;
  price: string;
  doctor: string;
  prescriberNo: string;
  date: string;
  scriptType: string;
  drug: string;           // what the doctor wrote (used for drug-check first-word matching)
  correctDrugSeedId: string; // seed_id of the drug variant the student must select
  directions: string;
  repeats: string;
  qty: string | number;
  price2: string;
  correctWarnings: string[];
  errors: string[];
  expectedDecision: DispenseDecision;
  drugDetails: DrugDetails; // retained for fallback display if drug table is unavailable
  tip: string;
}

export interface WarningLabel {
  lbl: string;
  sig: string;
  text: string;
}

export interface MessageRow {
  id: string;
  patient: string;
  item: string;
  summary: string;
  severity: "error" | "warning" | "info";
}

export type DispenseDecision =
  | "dispense"
  | "hold_contact_prescriber"
  | "do_not_supply";
