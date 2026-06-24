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
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
