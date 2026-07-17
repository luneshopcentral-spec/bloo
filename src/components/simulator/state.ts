import type { PracticeCase } from "@/lib/types/case";

/** The fields a student fills in for one prescribed medicine. */
export interface ItemFormState {
  drug: string;
  directions: string;
  repeats: string;
  qty: string;
  price: string;
}

/** Fields that belong to the prescription as a whole, not to one medicine. */
export interface FormState {
  scriptDate: string;
  scriptType: string;
  doctor: string;
  prescriberNo: string;
  authorityNumber: string;
  pharmacistInitials: string;
  items: ItemFormState[];
}

export type ScriptField = Exclude<keyof FormState, "items">;
export type ItemField = keyof ItemFormState;

export const EMPTY_ITEM_FORM_STATE: ItemFormState = {
  drug: "",
  directions: "",
  repeats: "",
  qty: "",
  price: "",
};

export const EMPTY_FORM_STATE: FormState = {
  scriptDate: "",
  scriptType: "N — NHS",
  doctor: "",
  prescriberNo: "",
  authorityNumber: "",
  pharmacistInitials: "",
  items: [{ ...EMPTY_ITEM_FORM_STATE }],
};

export function emptyFormStateFor(itemCount: number): FormState {
  return {
    ...EMPTY_FORM_STATE,
    items: Array.from({ length: Math.max(1, itemCount) }, () => ({ ...EMPTY_ITEM_FORM_STATE })),
  };
}

export type FormAction =
  | { type: "SET_FIELD"; field: ScriptField; value: string }
  | { type: "SET_ITEM_FIELD"; index: number; field: ItemField; value: string }
  | { type: "RESET"; itemCount?: number }
  | { type: "FILL_FROM_CASE"; case: PracticeCase };

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_ITEM_FIELD":
      return {
        ...state,
        items: state.items.map((item, index) =>
          index === action.index ? { ...item, [action.field]: action.value } : item
        ),
      };
    case "RESET":
      return emptyFormStateFor(action.itemCount ?? state.items.length);
    case "FILL_FROM_CASE": {
      const c = action.case;
      return {
        scriptDate: c.date,
        scriptType: c.scriptType,
        doctor: c.doctor,
        prescriberNo: c.expectedPrescriberNo ?? c.prescriberNo,
        authorityNumber: c.authority?.number ?? "",
        // preserve the student's own initials when showing answers
        pharmacistInitials: state.pharmacistInitials,
        items: c.items.map((item) => ({
          drug: item.drug,
          directions: item.directions,
          repeats: item.repeats,
          qty: String(item.qty),
          price: item.price2.replace("$", "").replace("Private", "").trim(),
        })),
      };
    }
  }
}
