export interface Prescriber {
  id: string;
  seed_id: string | null;
  title: string | null;
  surname: string;
  firstname: string;
  prescriber_number: string;
  practice_name: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  phone: string | null;
  created_at?: string;
}

export interface PrescriberFormData {
  title: string;
  surname: string;
  firstname: string;
  prescriberNumber: string;
  practiceName: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  phone: string;
}

export function formatPrescriberName(prescriber: Prescriber): string {
  return `${prescriber.surname}, ${prescriber.firstname}`;
}
