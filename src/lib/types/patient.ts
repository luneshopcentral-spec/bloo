export interface Patient {
  id: string;
  seed_id?: string | null;
  surname: string;
  firstname: string;
  title?: string | null;
  sex?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  phone?: string | null;
  medicare_card?: string | null;
  medicare_valid_to?: string | null;
  concession_type?: string | null;
  concession_number?: string | null;
  concession_valid_to?: string | null;
  allergies?: string[] | null;
  patient_notes?: string | null;
}

export interface PatientScript {
  id: string;
  patient_id: string;
  script_date: string;
  drug: string;
  qty?: string | null;
  repeats?: number | null;
  rx_number?: string | null;
}

export interface PatientFormData {
  surname: string;
  firstname: string;
  title?: string;
  sex?: string;
  dateOfBirth?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  phone?: string;
  medicareCard?: string;
  medicareValidTo?: string;
  concessionType?: string;
  concessionNumber?: string;
  concessionValidTo?: string;
  allergies?: string;      // multi-line text, split on save
  patientNotes?: string;
}
