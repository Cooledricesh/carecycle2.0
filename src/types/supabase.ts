/**
 * Supabase Database Type Definitions
 * Auto-generated types for database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          patient_number: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_number: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_number?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      items: {
        Row: {
          id: string
          name: string
          type: 'test' | 'injection'
          period_value: number
          period_unit: 'weeks' | 'months'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'test' | 'injection'
          period_value: number
          period_unit: 'weeks' | 'months'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'test' | 'injection'
          period_value?: number
          period_unit?: 'weeks' | 'months'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      patient_schedules: {
        Row: {
          id: string
          patient_id: string
          item_id: string
          first_date: string
          next_due_date: string
          last_completed_date: string | null
          is_active: boolean
          is_notified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          item_id: string
          first_date: string
          next_due_date: string
          last_completed_date?: string | null
          is_active?: boolean
          is_notified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          item_id?: string
          first_date?: string
          next_due_date?: string
          last_completed_date?: string | null
          is_active?: boolean
          is_notified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      schedule_history: {
        Row: {
          id: string
          patient_schedule_id: string
          scheduled_date: string
          completed_date: string | null
          actual_completion_date: string | null
          status: 'pending' | 'completed' | 'skipped'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_schedule_id: string
          scheduled_date: string
          completed_date?: string | null
          actual_completion_date?: string | null
          status: 'pending' | 'completed' | 'skipped'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_schedule_id?: string
          scheduled_date?: string
          completed_date?: string | null
          actual_completion_date?: string | null
          status?: 'pending' | 'completed' | 'skipped'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      register_patient_with_schedules: {
        Args: {
          p_patient_number: string
          p_name: string
          p_birth_date: string
          p_registration_date: string
          p_items: Json
        }
        Returns: {
          success: boolean
          message: string
          patient_id: string
        }
      }
      update_schedule_next_due_date: {
        Args: {
          schedule_id: string
        }
        Returns: void
      }
      get_dashboard_stats: {
        Args: Record<string, never>
        Returns: {
          total_patients: number
          total_schedules: number
          overdue_count: number
          upcoming_count: number
        }
      }
      get_recent_activities: {
        Args: {
          limit_count?: number
        }
        Returns: Array<{
          id: string
          patient_name: string
          patient_number: string
          item_name: string
          item_type: string
          action_type: string
          action_date: string
        }>
      }
      get_upcoming_schedules: {
        Args: {
          days_ahead?: number
        }
        Returns: Array<{
          id: string
          patient_name: string
          patient_number: string
          item_name: string
          item_type: string
          due_date: string
          days_until_due: number
        }>
      }
    }
    Enums: {
      item_type: 'test' | 'injection'
      period_unit: 'weeks' | 'months'
      schedule_status: 'pending' | 'completed' | 'skipped'
    }
  }
}

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type Patient = Tables<'patients'>
export type Item = Tables<'items'>
export type PatientSchedule = Tables<'patient_schedules'>
export type ScheduleHistory = Tables<'schedule_history'>

// Join types for common queries
export interface PatientScheduleWithRelations extends PatientSchedule {
  patient: Patient
  item: Item
}

export interface ScheduleHistoryWithRelations extends ScheduleHistory {
  patient_schedule: PatientScheduleWithRelations
}

// Response types for RPC functions
export interface DashboardStatsResult {
  total_patients: number
  total_schedules: number
  overdue_count: number
  upcoming_count: number
}

export interface RecentActivityResult {
  id: string
  patient_name: string
  patient_number: string
  item_name: string
  item_type: 'test' | 'injection'
  action_type: string
  action_date: string
}

export interface UpcomingScheduleResult {
  id: string
  patient_name: string
  patient_number: string
  item_name: string
  item_type: 'test' | 'injection'
  due_date: string
  days_until_due: number
}

export interface RegisterPatientResult {
  success: boolean
  message: string
  patient_id: string
}