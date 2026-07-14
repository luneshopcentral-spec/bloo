export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          university: string | null;
          year_of_study: number | null;
          has_paid: boolean;
          trial_cases_used: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          university?: string | null;
          year_of_study?: number | null;
          has_paid?: boolean;
          trial_cases_used?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          university?: string | null;
          year_of_study?: number | null;
          has_paid?: boolean;
          trial_cases_used?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      cases: {
        Row: {
          id: string;
          case_number: number;
          title: string;
          difficulty: "easy" | "medium" | "hard";
          category: string;
          case_data: Json;
          is_free_trial: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_number: number;
          title: string;
          difficulty: "easy" | "medium" | "hard";
          category: string;
          case_data: Json;
          is_free_trial?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_number?: number;
          title?: string;
          difficulty?: "easy" | "medium" | "hard";
          category?: string;
          case_data?: Json;
          is_free_trial?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          user_id: string;
          case_id: string;
          score: number;
          max_score: number;
          passed: boolean;
          details: Json;
          case_version: string;
          mode: "learn" | "practice" | "exam";
          assisted: boolean;
          counts_toward_progress: boolean;
          critical_failures: string[];
          competencies: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          case_id: string;
          score: number;
          max_score: number;
          passed: boolean;
          details: Json;
          case_version: string;
          mode: "learn" | "practice" | "exam";
          assisted?: boolean;
          counts_toward_progress?: boolean;
          critical_failures?: string[];
          competencies?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          case_id?: string;
          score?: number;
          max_score?: number;
          passed?: boolean;
          details?: Json;
          case_version?: string;
          mode?: "learn" | "practice" | "exam";
          assisted?: boolean;
          counts_toward_progress?: boolean;
          critical_failures?: string[];
          competencies?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          seed_id: string | null;
          surname: string;
          firstname: string;
          title: string | null;
          sex: string | null;
          date_of_birth: string | null;
          address: string | null;
          suburb: string | null;
          postcode: string | null;
          phone: string | null;
          medicare_card: string | null;
          medicare_valid_to: string | null;
          concession_type: string | null;
          concession_number: string | null;
          concession_valid_to: string | null;
          allergies: string[] | null;
          patient_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
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
          created_at?: string;
        };
        Update: {
          id?: string;
          seed_id?: string | null;
          surname?: string;
          firstname?: string;
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
          created_at?: string;
        };
        Relationships: [];
      };
      patient_scripts: {
        Row: {
          id: string;
          patient_id: string;
          script_date: string;
          drug: string;
          qty: string | null;
          repeats: number | null;
          rx_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          script_date: string;
          drug: string;
          qty?: string | null;
          repeats?: number | null;
          rx_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          script_date?: string;
          drug?: string;
          qty?: string | null;
          repeats?: number | null;
          rx_number?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      prescribers: {
        Row: {
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
          created_at: string;
        };
        Insert: {
          id?: string;
          seed_id?: string | null;
          title?: string | null;
          surname: string;
          firstname: string;
          prescriber_number: string;
          practice_name?: string | null;
          address?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          seed_id?: string | null;
          title?: string | null;
          surname?: string;
          firstname?: string;
          prescriber_number?: string;
          practice_name?: string | null;
          address?: string | null;
          suburb?: string | null;
          state?: string | null;
          postcode?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      drugs: {
        Row: {
          id: string;
          seed_id: string;
          generic_name: string;
          brand_name: string | null;
          full_display_name: string;
          form: string;
          strength: string;
          pack_size: string;
          qty_default: number;
          repeats_default: number;
          supply_type: string;
          schedule: string | null;
          pbs_code: string | null;
          ws_cost: number | null;
          retail_price: number | null;
          manufacturer_code: string | null;
          manufacturer_full: string | null;
          is_generic: boolean;
          cmi_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          seed_id: string;
          generic_name: string;
          brand_name?: string | null;
          full_display_name: string;
          form: string;
          strength: string;
          pack_size: string;
          qty_default: number;
          repeats_default?: number;
          supply_type: string;
          schedule?: string | null;
          pbs_code?: string | null;
          ws_cost?: number | null;
          retail_price?: number | null;
          manufacturer_code?: string | null;
          manufacturer_full?: string | null;
          is_generic?: boolean;
          cmi_available?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          seed_id?: string;
          generic_name?: string;
          brand_name?: string | null;
          full_display_name?: string;
          form?: string;
          strength?: string;
          pack_size?: string;
          qty_default?: number;
          repeats_default?: number;
          supply_type?: string;
          schedule?: string | null;
          pbs_code?: string | null;
          ws_cost?: number | null;
          retail_price?: number | null;
          manufacturer_code?: string | null;
          manufacturer_full?: string | null;
          is_generic?: boolean;
          cmi_available?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
