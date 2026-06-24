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

export interface PatientHistoryItem {
  date: string;
  rx: string;
  qty: number | string;
  rpt: number;
  drug: string;
}

export interface PracticeCase {
  id: string;
  caseNumber: number;
  title: string;
  complaint: string;
  history: string;
  allergies: string;
  currentMeds: string;
  task: string;
  patient: string;
  addr: string;
  price: string;
  mcare: string;
  doctor: string;
  prescriberNo: string;
  date: string;
  scriptType: string;
  drug: string;
  directions: string;
  repeats: string;
  qty: string | number;
  price2: string;
  correctWarnings: string[];
  errors: string[];
  allergyAlert: string;
  drugDetails: DrugDetails;
  patientHistory: PatientHistoryItem[];
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
