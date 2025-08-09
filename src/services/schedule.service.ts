/**
 * Schedule Service Layer
 * Pure business logic for schedule operations, separated from HTTP concerns
 * Accepts dependencies for testability
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  Schedule,
  ScheduleHistory,
  ScheduleUpdateRequest,
  ScheduleServiceDeps
} from '@/features/schedule/types';

export class ScheduleService {
  constructor(private deps: ScheduleServiceDeps) {}

  /**
   * Get today's scheduled items
   * Returns all schedules that are due today
   */
  async getTodaySchedules(): Promise<Schedule[]> {
    const { supabase } = this.deps;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Query patient_schedules that are due today
    const { data, error } = await supabase
      .from('patient_schedules')
      .select(`
        id,
        next_due_date,
        patient:patients (
          id,
          name,
          patient_number
        ),
        item:items (
          id,
          name,
          type
        )
      `)
      .eq('next_due_date', today)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch today's schedules: ${error.message}`);
    }

    // Format the response to match the Schedule interface
    return (data || []).map((schedule: any) => ({
      scheduleId: schedule.id,
      scheduledDate: schedule.next_due_date,
      patient: {
        id: schedule.patient?.id || '',
        name: schedule.patient?.name || '',
        patientNumber: schedule.patient?.patient_number || ''
      },
      item: {
        id: schedule.item?.id || '',
        name: schedule.item?.name || '',
        type: schedule.item?.type || 'test'
      }
    }));
  }

  /**
   * Update schedule completion status
   * Uses the stored procedure to handle complex business logic
   */
  async updateScheduleCompletion(updateData: ScheduleUpdateRequest): Promise<void> {
    const { supabase } = this.deps;
    const { scheduleId, isCompleted, notes, actualCompletionDate } = updateData;
    
    if (!scheduleId) {
      throw new Error('Schedule ID is required');
    }

    // Call the stored procedure to handle the update
    const { error } = await supabase.rpc('handle_schedule_completion', {
      p_schedule_id: scheduleId,
      p_is_completed: isCompleted,
      p_notes: notes || null,
      p_actual_date: actualCompletionDate || null
    });

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }
  }

  /**
   * Get schedule history for a specific schedule
   * Useful for tracking completion history and patterns
   */
  async getScheduleHistory(scheduleId: string): Promise<ScheduleHistory[]> {
    const { supabase } = this.deps;
    
    if (!scheduleId) {
      throw new Error('Schedule ID is required');
    }

    const { data, error } = await supabase
      .from('schedule_history')
      .select(`
        id,
        patient_schedule_id,
        scheduled_date,
        completed_date,
        actual_completion_date,
        status,
        notes
      `)
      .eq('patient_schedule_id', scheduleId)
      .order('scheduled_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch schedule history: ${error.message}`);
    }

    return (data || []).map((history: any) => ({
      id: history.id,
      scheduleId: history.patient_schedule_id,
      scheduledDate: history.scheduled_date,
      completedDate: history.completed_date,
      actualCompletionDate: history.actual_completion_date,
      status: history.status as 'pending' | 'completed' | 'skipped',
      notes: history.notes
    }));
  }

  /**
   * Get overdue schedules
   * Returns schedules that are past their due date but not completed
   */
  async getOverdueSchedules(): Promise<Schedule[]> {
    const { supabase } = this.deps;
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('patient_schedules')
      .select(`
        id,
        next_due_date,
        patient:patients (
          id,
          name,
          patient_number
        ),
        item:items (
          id,
          name,
          type
        ),
        schedule_history (
          status,
          scheduled_date
        )
      `)
      .lt('next_due_date', today)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch overdue schedules: ${error.message}`);
    }

    // Filter overdue items that are not completed
    const overdueSchedules = (data || []).filter((schedule: any) => {
      const historyForDueDate = schedule.schedule_history.find(
        (h: any) => h.scheduled_date === schedule.next_due_date
      );
      return !historyForDueDate || historyForDueDate.status !== 'completed';
    });

    return overdueSchedules.map((schedule: any) => ({
      scheduleId: schedule.id,
      scheduledDate: schedule.next_due_date,
      patient: {
        id: schedule.patient?.id || '',
        name: schedule.patient?.name || '',
        patientNumber: schedule.patient?.patient_number || ''
      },
      item: {
        id: schedule.item?.id || '',
        name: schedule.item?.name || '',
        type: schedule.item?.type || 'test'
      }
    }));
  }

  /**
   * Get upcoming schedules for the next N days
   * Useful for planning and workflow optimization
   */
  async getUpcomingSchedules(daysAhead: number = 7): Promise<Schedule[]> {
    const { supabase } = this.deps;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('patient_schedules')
      .select(`
        id,
        next_due_date,
        patient:patients (
          id,
          name,
          patient_number
        ),
        item:items (
          id,
          name,
          type
        ),
        schedule_history (
          status,
          scheduled_date
        )
      `)
      .gte('next_due_date', today)
      .lte('next_due_date', endDateStr)
      .eq('is_active', true)
      .order('next_due_date');

    if (error) {
      throw new Error(`Failed to fetch upcoming schedules: ${error.message}`);
    }

    // Filter schedules that are not yet completed
    const upcomingSchedules = (data || []).filter((schedule: any) => {
      const historyForDueDate = schedule.schedule_history.find(
        (h: any) => h.scheduled_date === schedule.next_due_date
      );
      return !historyForDueDate || historyForDueDate.status !== 'completed';
    });

    return upcomingSchedules.map((schedule: any) => ({
      scheduleId: schedule.id,
      scheduledDate: schedule.next_due_date,
      patient: {
        id: schedule.patient?.id || '',
        name: schedule.patient?.name || '',
        patientNumber: schedule.patient?.patient_number || ''
      },
      item: {
        id: schedule.item?.id || '',
        name: schedule.item?.name || '',
        type: schedule.item?.type || 'test'
      }
    }));
  }

  /**
   * Get schedule statistics for analytics
   * Returns completion rates and other metrics
   */
  async getScheduleStats() {
    const { supabase } = this.deps;
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's completion stats
    const { data: todaySchedules, error: todayError } = await supabase
      .from('schedule_history')
      .select('status')
      .eq('scheduled_date', today);

    if (todayError) {
      throw new Error(`Failed to fetch today's schedule stats: ${todayError.message}`);
    }

    const todayTotal = todaySchedules?.length || 0;
    const todayCompleted = todaySchedules?.filter((s: any) => s.status === 'completed').length || 0;
    const todayCompletionRate = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

    // Get overdue count
    const overdueSchedules = await this.getOverdueSchedules();
    const overdueCount = overdueSchedules.length;

    return {
      todayTotal,
      todayCompleted,
      todayCompletionRate: Math.round(todayCompletionRate * 10) / 10,
      overdueCount
    };
  }
}

// Factory function for creating schedule service with dependencies
export const createScheduleService = (supabase: SupabaseClient): ScheduleService => {
  return new ScheduleService({ supabase });
};