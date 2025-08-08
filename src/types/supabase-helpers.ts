import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Type definitions for Supabase client and responses
 */

// Base Supabase Client type with proper typing
export type TypedSupabaseClient = SupabaseClient<Database>;

// Database schema types (extend as needed based on your schema)
export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          name: string;
          patient_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      items: {
        Row: {
          id: string;
          name: string;
          type: 'test' | 'injection';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['items']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['items']['Insert']>;
      };
      patient_schedules: {
        Row: {
          id: string;
          patient_id: string;
          item_id: string;
          next_due_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patient_schedules']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patient_schedules']['Insert']>;
      };
      schedule_history: {
        Row: {
          id: string;
          patient_schedule_id: string;
          scheduled_date: string;
          completed_date: string | null;
          actual_completion_date: string | null;
          status: 'pending' | 'completed' | 'skipped';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schedule_history']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['schedule_history']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      item_type: 'test' | 'injection';
      schedule_status: 'pending' | 'completed' | 'skipped';
    };
  };
}

// Helper type for joined queries
export interface ScheduleWithRelations {
  id: string;
  next_due_date: string;
  is_active: boolean;
  patients?: {
    name: string;
    patient_number: string;
  };
  items?: {
    name: string;
    type: 'test' | 'injection';
  };
}

export interface ScheduleHistoryWithRelations {
  id: string;
  scheduled_date: string;
  completed_date: string | null;
  actual_completion_date: string | null;
  status: 'pending' | 'completed' | 'skipped';
  notes: string | null;
  patient_schedules?: {
    id: string;
    patients?: {
      name: string;
      patient_number: string;
    };
    items?: {
      name: string;
      type: 'test' | 'injection';
    };
  };
}

// Completion rate calculation dates type
export interface CompletionRateDates {
  today: string;
  weekStart: string;
  monthStart: string;
}