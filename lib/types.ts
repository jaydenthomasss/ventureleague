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
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          role: "teacher" | "student";
          team_id: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          role?: "teacher" | "student";
          team_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          role?: "teacher" | "student";
          team_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          join_code: string;
          cash_balance: number;
          session_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          join_code: string;
          cash_balance?: number;
          session_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          join_code?: string;
          cash_balance?: number;
          session_id?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          name: string;
          current_round: number;
          status: "active" | "closed";
          created_by: string;
          submissions_open: boolean;
          session_code: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          current_round?: number;
          status?: "active" | "closed";
          created_by: string;
          submissions_open?: boolean;
          session_code?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          current_round?: number;
          status?: "active" | "closed";
          created_by?: string;
          submissions_open?: boolean;
          session_code?: string | null;
        };
        Relationships: [];
      };
      scenarios: {
        Row: {
          id: string;
          session_id: string;
          round_number: number;
          description: string;
          demand_multiplier: number;
          cost_shock: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          round_number: number;
          description: string;
          demand_multiplier?: number;
          cost_shock?: number;
        };
        Update: {
          id?: string;
          session_id?: string;
          round_number?: number;
          description?: string;
          demand_multiplier?: number;
          cost_shock?: number;
        };
        Relationships: [];
      };
      decisions: {
        Row: {
          id: string;
          team_id: string;
          round_number: number;
          price: number;
          marketing_spend: number;
          units_produced: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          round_number: number;
          price: number;
          marketing_spend: number;
          units_produced: number;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          round_number?: number;
          price?: number;
          marketing_spend?: number;
          units_produced?: number;
          submitted_at?: string;
        };
        Relationships: [];
      };
      round_results: {
        Row: {
          id: string;
          team_id: string;
          round_number: number;
          units_sold: number;
          revenue: number;
          costs: number;
          profit: number;
          market_share: number;
          cumulative_profit: number;
        };
        Insert: {
          id?: string;
          team_id: string;
          round_number: number;
          units_sold: number;
          revenue: number;
          costs: number;
          profit: number;
          market_share: number;
          cumulative_profit: number;
        };
        Update: {
          id?: string;
          team_id?: string;
          round_number?: number;
          units_sold?: number;
          revenue?: number;
          costs?: number;
          profit?: number;
          market_share?: number;
          cumulative_profit?: number;
        };
        Relationships: [];
      };
      pitches: {
        Row: {
          id: string;
          team_id: string;
          round_number: number;
          pitch_text: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          round_number: number;
          pitch_text: string;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          round_number?: number;
          pitch_text?: string;
          submitted_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience types
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];
export type Decision = Database["public"]["Tables"]["decisions"]["Row"];
export type RoundResult = Database["public"]["Tables"]["round_results"]["Row"];
export type Pitch = Database["public"]["Tables"]["pitches"]["Row"];
