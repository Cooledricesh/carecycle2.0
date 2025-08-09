/**
 * Patient Service Layer
 * Pure business logic for patient operations, separated from HTTP concerns
 * Accepts dependencies for testability
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateNextDueDate } from '@/lib/schedule-utils';
import type { 
  Patient,
  PatientWithSchedules,
  PatientRegistrationData,
  PatientScheduleInput,
  PatientServiceDeps
} from '@/features/patient/types';

export class PatientService {
  constructor(private deps: PatientServiceDeps) {}

  /**
   * Register a new patient with their schedules
   * Uses the stored procedure for atomic operation
   */
  async registerPatient(patientData: PatientRegistrationData): Promise<Patient> {
    const { supabase } = this.deps;
    const { patientNumber, name, schedules } = patientData;
    
    // Validate input
    if (!patientNumber || !name || !schedules || !Array.isArray(schedules)) {
      throw new Error('Missing required fields: patientNumber, name, and schedules');
    }

    if (schedules.length === 0) {
      throw new Error('At least one schedule is required');
    }
    
    // Prepare schedules with calculated next due dates
    const preparedSchedules = schedules.map(schedule => ({
      item_id: schedule.itemId,
      first_date: schedule.firstDate,
      next_due_date: calculateNextDueDate(
        schedule.firstDate,
        {
          value: schedule.periodValue,
          unit: schedule.periodUnit
        }
      ).toISOString().split('T')[0]
    }));
    
    // Call RPC function to register patient with schedules
    const { data, error } = await supabase.rpc('register_patient_with_schedules', {
      p_patient_number: patientNumber,
      p_name: name,
      p_schedules: preparedSchedules
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        throw new Error('Patient with this number already exists');
      }
      
      if (error.message.includes('Invalid item_id')) {
        throw new Error('One or more selected items are invalid');
      }
      
      throw new Error(`Failed to register patient: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Get all patients with their schedules
   */
  async getAllPatients(): Promise<PatientWithSchedules[]> {
    const { supabase } = this.deps;
    
    const { data, error } = await supabase
      .from('patients')
      .select(`
        id,
        patient_number,
        name,
        created_at,
        updated_at,
        patient_schedules (
          id,
          patient_id,
          item_id,
          first_date,
          next_due_date,
          is_active,
          created_at,
          items (
            id,
            name,
            type,
            period_value,
            period_unit
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }
    
    // Transform the data to match our interface
    return (data || []).map((patient: any) => ({
      id: patient.id,
      patientNumber: patient.patient_number,
      name: patient.name,
      createdAt: patient.created_at,
      updatedAt: patient.updated_at,
      patientSchedules: (patient.patient_schedules || []).map((schedule: any) => ({
        id: schedule.id,
        patientId: schedule.patient_id,
        itemId: schedule.item_id,
        firstDate: schedule.first_date,
        nextDueDate: schedule.next_due_date,
        isActive: schedule.is_active,
        createdAt: schedule.created_at,
        item: {
          id: schedule.items?.id || '',
          name: schedule.items?.name || '',
          type: schedule.items?.type || 'test',
          periodValue: schedule.items?.period_value || 0,
          periodUnit: schedule.items?.period_unit || 'days'
        }
      }))
    }));
  }

  /**
   * Get a specific patient by ID with their schedules
   */
  async getPatientById(patientId: string): Promise<PatientWithSchedules | null> {
    const { supabase } = this.deps;
    
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    
    const { data, error } = await supabase
      .from('patients')
      .select(`
        id,
        patient_number,
        name,
        created_at,
        updated_at,
        patient_schedules (
          id,
          patient_id,
          item_id,
          first_date,
          next_due_date,
          is_active,
          created_at,
          items (
            id,
            name,
            type,
            period_value,
            period_unit
          )
        )
      `)
      .eq('id', patientId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Patient not found
      }
      throw new Error(`Failed to fetch patient: ${error.message}`);
    }
    
    if (!data) {
      return null;
    }
    
    // Transform the data to match our interface
    return {
      id: data.id,
      patientNumber: data.patient_number,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      patientSchedules: (data.patient_schedules || []).map((schedule: any) => ({
        id: schedule.id,
        patientId: schedule.patient_id,
        itemId: schedule.item_id,
        firstDate: schedule.first_date,
        nextDueDate: schedule.next_due_date,
        isActive: schedule.is_active,
        createdAt: schedule.created_at,
        item: {
          id: schedule.items?.id || '',
          name: schedule.items?.name || '',
          type: schedule.items?.type || 'test',
          periodValue: schedule.items?.period_value || 0,
          periodUnit: schedule.items?.period_unit || 'days'
        }
      }))
    };
  }

  /**
   * Get available items for schedule creation
   */
  async getAvailableItems() {
    const { supabase } = this.deps;
    
    const { data, error } = await supabase
      .from('items')
      .select('id, name, type, period_value, period_unit')
      .order('type')
      .order('name');
    
    if (error) {
      throw new Error(`Failed to fetch available items: ${error.message}`);
    }
    
    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type as 'test' | 'injection',
      periodValue: item.period_value,
      periodUnit: item.period_unit as 'days' | 'weeks' | 'months' | 'years'
    }));
  }

  /**
   * Update patient information (name only for now)
   */
  async updatePatient(patientId: string, updates: Partial<Pick<Patient, 'name'>>): Promise<Patient> {
    const { supabase } = this.deps;
    
    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    if (!updates.name?.trim()) {
      throw new Error('Patient name is required');
    }
    
    const { data, error } = await supabase
      .from('patients')
      .update({
        name: updates.name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Patient not found');
      }
      throw new Error(`Failed to update patient: ${error.message}`);
    }
    
    return {
      id: data.id,
      patientNumber: data.patient_number,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Deactivate a patient (soft delete)
   * This will also deactivate all their schedules
   */
  async deactivatePatient(patientId: string): Promise<void> {
    const { supabase } = this.deps;
    
    if (!patientId) {
      throw new Error('Patient ID is required');
    }
    
    // Start a transaction to deactivate patient and schedules
    const { error } = await supabase.rpc('deactivate_patient_with_schedules', {
      p_patient_id: patientId
    });
    
    if (error) {
      throw new Error(`Failed to deactivate patient: ${error.message}`);
    }
  }

  /**
   * Search patients by name or patient number
   */
  async searchPatients(query: string): Promise<PatientWithSchedules[]> {
    const { supabase } = this.deps;
    
    if (!query?.trim()) {
      return [];
    }
    
    const searchTerm = `%${query.trim()}%`;
    
    const { data, error } = await supabase
      .from('patients')
      .select(`
        id,
        patient_number,
        name,
        created_at,
        updated_at,
        patient_schedules (
          id,
          patient_id,
          item_id,
          first_date,
          next_due_date,
          is_active,
          created_at,
          items (
            id,
            name,
            type,
            period_value,
            period_unit
          )
        )
      `)
      .or(`name.ilike.${searchTerm},patient_number.ilike.${searchTerm}`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      throw new Error(`Failed to search patients: ${error.message}`);
    }
    
    // Transform the data to match our interface
    return (data || []).map((patient: any) => ({
      id: patient.id,
      patientNumber: patient.patient_number,
      name: patient.name,
      createdAt: patient.created_at,
      updatedAt: patient.updated_at,
      patientSchedules: (patient.patient_schedules || []).map((schedule: any) => ({
        id: schedule.id,
        patientId: schedule.patient_id,
        itemId: schedule.item_id,
        firstDate: schedule.first_date,
        nextDueDate: schedule.next_due_date,
        isActive: schedule.is_active,
        createdAt: schedule.created_at,
        item: {
          id: schedule.items?.id || '',
          name: schedule.items?.name || '',
          type: schedule.items?.type || 'test',
          periodValue: schedule.items?.period_value || 0,
          periodUnit: schedule.items?.period_unit || 'days'
        }
      }))
    }));
  }

  /**
   * Get patient statistics
   */
  async getPatientStats() {
    const { supabase } = this.deps;
    
    // Get total patients count
    const { count: totalPatients, error: patientsError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (patientsError) {
      throw new Error(`Failed to fetch patient count: ${patientsError.message}`);
    }

    // Get active schedules count
    const { count: activeSchedules, error: schedulesError } = await supabase
      .from('patient_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (schedulesError) {
      throw new Error(`Failed to fetch active schedules count: ${schedulesError.message}`);
    }

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentRegistrations, error: recentError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) {
      throw new Error(`Failed to fetch recent registrations: ${recentError.message}`);
    }

    return {
      totalPatients: totalPatients || 0,
      activeSchedules: activeSchedules || 0,
      recentRegistrations: recentRegistrations || 0
    };
  }
}

// Factory function for creating patient service with dependencies
export const createPatientService = (supabase: SupabaseClient): PatientService => {
  return new PatientService({ supabase });
};