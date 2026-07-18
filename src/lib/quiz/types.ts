export type QuizDomain =
  | "dose_calculation"
  | "dose_selection"
  | "interaction"
  | "warning_labels"
  | "consultation"
  | "red_flags"
  | "clinical_action"
  | "legal_and_prescription";

export interface QuizPatient {
  name: string;
  dateOfBirth: string;
  age: string;
  weight?: string;
  address: string;
  consultationNotes: string[];
}

export interface QuizPrescriptionItem {
  medicineProfileId: string;
  product: string;
  formAndStrength: string;
  directions: string;
  quantity: string;
  repeats: string;
  authority?: string;
}

export interface QuizPrescription {
  id: string;
  prescriber: string;
  prescriberNumber: string;
  date: string;
  items: QuizPrescriptionItem[];
  annotations?: string[];
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  domain: QuizDomain;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  referenceNote: string;
  critical?: boolean;
}

export interface ConsultationQuizCase {
  id: string;
  title: string;
  subtitle: string;
  difficulty: "Advanced" | "Expert";
  estimatedMinutes: number;
  focus: string[];
  patient: QuizPatient;
  prescriptions: QuizPrescription[];
  medicineProfileIds: string[];
  questions: QuizQuestion[];
  reviewStatus: "pharmacist_review_required";
}

export type QuizMode = "practice" | "challenge";

export interface QuizAnswerResult {
  question: QuizQuestion;
  selectedOptionId: string | null;
  correct: boolean;
}

export interface QuizResult {
  correct: number;
  total: number;
  percentage: number;
  criticalPassed: boolean;
  passed: boolean;
  answers: QuizAnswerResult[];
}
