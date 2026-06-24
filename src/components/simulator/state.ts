import type { PracticeCase } from "@/lib/types/case";

export interface FormState {
  scriptDate: string;
  scriptType: string;
  hospitalProvNo: string;
  doctor: string;
  prescriberNo: string;
  drug: string;
  directions: string;
  repeats: string;
  qty: string;
  price: string;
  pharmacistInitials: string;
}

export const EMPTY_FORM_STATE: FormState = {
  scriptDate: "",
  scriptType: "N — NHS",
  hospitalProvNo: "",
  doctor: "",
  prescriberNo: "",
  drug: "",
  directions: "",
  repeats: "",
  qty: "",
  price: "",
  pharmacistInitials: "",
};

export type FormAction =
  | { type: "SET_FIELD"; field: keyof FormState; value: string }
  | { type: "RESET" }
  | { type: "FILL_FROM_CASE"; case: PracticeCase };

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "RESET":
      return { ...EMPTY_FORM_STATE };
    case "FILL_FROM_CASE": {
      const c = action.case;
      return {
        scriptDate: c.date,
        scriptType: c.scriptType,
        hospitalProvNo: "",
        doctor: c.doctor,
        prescriberNo: c.prescriberNo,
        drug: c.drug,
        directions: c.directions,
        repeats: c.repeats,
        qty: String(c.qty),
        price: c.price2.replace("$", "").replace("Private", "").trim(),
        // preserve the student's own initials when showing answers
        pharmacistInitials: state.pharmacistInitials,
      };
    }
  }
}
