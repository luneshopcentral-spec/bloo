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
      feedback: {
        Row: { id: string; user_id: string; kind: string; case_id: string | null; message: string; status: string; created_at: string };
        Insert: { user_id: string; kind: string; case_id?: string | null; message: string };
        Update: { status?: string };
        Relationships: [];
      };
      quiz_attempts: {
        Row: { id: string; user_id: string; case_id: string; version: string; mode: "practice" | "challenge"; answers: Json; percentage: number; created_at: string };
        Insert: { id: string; user_id: string; case_id: string; version: string; mode: "practice" | "challenge"; answers: Json; percentage: number };
        Update: { answers?: Json };
        Relationships: [];
      };
      practice_sessions: {
        Row: { id: string; user_id: string; case_id: string; case_version: string; seed: number; mode: "learn" | "practice" | "exam"; assisted: boolean; created_at: string };
        Insert: { id?: string; user_id: string; case_id: string; case_version: string; seed: number; mode: "learn" | "practice" | "exam"; assisted?: boolean };
        Update: { assisted?: boolean };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          university: string | null;
          year_of_study: number | null;
          has_paid: boolean;
          trial_cases_used: number;
          role: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_plan: string | null;
          subscription_status: string | null;
          subscription_current_period_start: string | null;
          subscription_current_period_end: string | null;
          subscription_cancel_at_period_end: boolean;
          subscription_updated_at: string | null;
          study_stage: string | null;
          comp_access_until: string | null;
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
          role?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_start?: string | null;
          subscription_current_period_end?: string | null;
          subscription_cancel_at_period_end?: boolean;
          subscription_updated_at?: string | null;
          study_stage?: string | null;
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
          role?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_plan?: string | null;
          subscription_status?: string | null;
          subscription_current_period_start?: string | null;
          subscription_current_period_end?: string | null;
          subscription_cancel_at_period_end?: boolean;
          subscription_updated_at?: string | null;
          study_stage?: string | null;
          comp_access_until?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_settings: {
        Row: { key: string; value: Json; updated_by: string | null; updated_at: string };
        Insert: { key: string; value: Json; updated_by?: string | null; updated_at?: string };
        Update: { value?: Json; updated_by?: string | null; updated_at?: string };
        Relationships: [];
      };
      announcements: {
        Row: { id: string; title: string; body: string; level: "info" | "success" | "warning" | "critical"; active: boolean; starts_at: string; ends_at: string | null; created_by: string | null; created_at: string };
        Insert: { id?: string; title: string; body: string; level?: "info" | "success" | "warning" | "critical"; active?: boolean; starts_at?: string; ends_at?: string | null; created_by?: string | null };
        Update: { title?: string; body?: string; level?: "info" | "success" | "warning" | "critical"; active?: boolean; starts_at?: string; ends_at?: string | null };
        Relationships: [];
      };
      access_codes: {
        Row: { code: string; description: string | null; grants_days: number; max_redemptions: number | null; redemptions: number; active: boolean; expires_at: string | null; created_by: string | null; created_at: string };
        Insert: { code: string; description?: string | null; grants_days: number; max_redemptions?: number | null; active?: boolean; expires_at?: string | null; created_by?: string | null };
        Update: { description?: string | null; active?: boolean; max_redemptions?: number | null; expires_at?: string | null };
        Relationships: [];
      };
      access_code_redemptions: {
        Row: { id: string; code: string; user_id: string; granted_until: string; redeemed_at: string };
        Insert: { code: string; user_id: string; granted_until: string };
        Update: never;
        Relationships: [];
      };
      admin_audit_log: {
        Row: { id: string; actor_id: string | null; actor_email: string | null; action: string; target_type: string | null; target_id: string | null; detail: Json; created_at: string };
        Insert: { actor_id?: string | null; actor_email?: string | null; action: string; target_type?: string | null; target_id?: string | null; detail?: Json };
        Update: never;
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          event_type: string;
          object_id: string | null;
          status: "processing" | "processed" | "failed";
          attempts: number;
          error_message: string | null;
          received_at: string;
          last_attempt_at: string;
          processed_at: string | null;
        };
        Insert: {
          id: string;
          event_type: string;
          object_id?: string | null;
          status: "processing" | "processed" | "failed";
          attempts?: number;
          error_message?: string | null;
          received_at?: string;
          last_attempt_at?: string;
          processed_at?: string | null;
        };
        Update: {
          event_type?: string;
          object_id?: string | null;
          status?: "processing" | "processed" | "failed";
          attempts?: number;
          error_message?: string | null;
          last_attempt_at?: string;
          processed_at?: string | null;
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
          server_verified?: boolean;
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
          server_verified?: boolean;
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
          server_verified?: boolean;
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
      launch_schema_ready: { Args: Record<string, never>; Returns: boolean };
      consume_request_limit: { Args: { request_key: string; maximum: number }; Returns: boolean };
      acquire_operation_lock: { Args: { lock_key: string; lock_owner: string }; Returns: boolean };
      release_operation_lock: { Args: { lock_key: string; lock_owner: string }; Returns: undefined };
      redeem_access_code: { Args: { input_code: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
