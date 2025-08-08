/**
 * Dashboard utility functions for CareCycle 2.0
 * Provides common functionality for dashboard API endpoints
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { format, startOfWeek, startOfMonth } from 'date-fns';

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Get formatted date ranges for dashboard calculations
 */
export function getDashboardDateRanges() {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  
  // Week start (Monday)
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  // Month start
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

  return {
    today,
    weekStart,
    monthStart
  };
}

/**
 * Calculate completion rate for a given period
 */
export async function calculateCompletionRate(
  supabase: SupabaseClient,
  dateRange: DateRange
): Promise<{ completionRate: number; completed: number; total: number }> {
  try {
    const { data: scheduleData, error } = await supabase
      .from('schedule_history')
      .select('id, status')
      .gte('scheduled_date', dateRange.start)
      .lte('scheduled_date', dateRange.end);

    if (error) {
      throw new Error(`Failed to fetch schedule data: ${error.message}`);
    }

    const total = scheduleData?.length || 0;
    const completed = scheduleData?.filter(s => s.status === 'completed').length || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      completionRate: Math.round(completionRate * 10) / 10,
      completed,
      total
    };
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    return { completionRate: 0, completed: 0, total: 0 };
  }
}

/**
 * Get overdue items count (items past due date without completion)
 */
export async function getOverdueItemsCount(
  supabase: SupabaseClient,
  today: string
): Promise<number> {
  try {
    const { data: overdueSchedules, error } = await supabase
      .from('patient_schedules')
      .select(`
        id,
        next_due_date,
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

    if (!overdueSchedules) return 0;

    // Filter schedules that don't have a completed history entry for the due date
    const overdueCount = overdueSchedules.filter(schedule => {
      const historyForDueDate = schedule.schedule_history?.find(
        (h: any) => h.scheduled_date === schedule.next_due_date
      );
      return !historyForDueDate || historyForDueDate.status !== 'completed';
    }).length;

    return overdueCount;
  } catch (error) {
    console.error('Error calculating overdue items:', error);
    return 0;
  }
}

/**
 * Format date for display (e.g., "Jan 15")
 */
export function formatDateShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Get week boundaries (Monday to Sunday)
 */
export function getWeekBoundaries(weeksAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  
  // Go to Monday of the target week
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(now.getDate() + daysToMonday - (weeksAgo * 7));
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Sunday
  
  return { start, end };
}

/**
 * Validate Supabase response and throw descriptive errors
 */
export function validateSupabaseResponse<T>(
  data: T | null,
  error: any,
  operation: string
): T {
  if (error) {
    throw new Error(`${operation} failed: ${error.message}`);
  }
  
  if (data === null) {
    throw new Error(`${operation} returned no data`);
  }
  
  return data;
}

/**
 * Safe number conversion with fallback
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}