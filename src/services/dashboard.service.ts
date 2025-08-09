/**
 * Dashboard Service Layer
 * Pure business logic for dashboard operations, separated from HTTP concerns
 * Accepts dependencies for testability
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
  DashboardStatsResponse,
  DashboardRecentResponse, 
  DashboardTrendsResponse,
  RecentActivity,
  UpcomingSchedule,
  WeeklyCompletionRate,
  ItemTypeDistribution
} from '@/types/dashboard';

export interface DashboardServiceDeps {
  supabase: SupabaseClient;
}

export class DashboardService {
  constructor(private deps: DashboardServiceDeps) {}

  /**
   * Get dashboard statistics including patient count, today's schedule, and completion rates
   */
  async getStats(): Promise<DashboardStatsResponse> {
    const { supabase } = this.deps;
    const today: string = new Date().toISOString().split('T')[0];
    
    // Get total patients count
    const { count: totalPatients, error: patientsError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (patientsError) {
      throw new Error(`Failed to fetch patients count: ${patientsError.message}`);
    }

    // Get today's scheduled items (due today)
    const { count: todayScheduled, error: todayError } = await supabase
      .from('patient_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('next_due_date', today)
      .eq('is_active', true);

    if (todayError) {
      throw new Error(`Failed to fetch today's scheduled items: ${todayError.message}`);
    }

    // Get overdue items
    const overdueItems = await this.getOverdueItemsCount(today);

    // Calculate completion rates
    const completionRates = await this.calculateCompletionRates(today);

    return {
      totalPatients: totalPatients || 0,
      todayScheduled: todayScheduled || 0,
      completionRates,
      overdueItems
    };
  }

  /**
   * Get recent activity and upcoming schedules
   */
  async getRecentData(): Promise<DashboardRecentResponse> {
    const [recentActivity, upcomingSchedules] = await Promise.all([
      this.getRecentActivity(),
      this.getUpcomingSchedules()
    ]);

    return {
      recentActivity,
      upcomingSchedules
    };
  }

  /**
   * Get dashboard trends including weekly completion rates and item type distribution
   */
  async getTrends(): Promise<DashboardTrendsResponse> {
    const [weeklyCompletionRates, itemTypeDistribution] = await Promise.all([
      this.getWeeklyCompletionRates(),
      this.getItemTypeDistribution()
    ]);

    return {
      weeklyCompletionRates,
      itemTypeDistribution
    };
  }

  /**
   * Private helper methods
   */

  private async getOverdueItemsCount(today: string): Promise<number> {
    const { supabase } = this.deps;
    
    const { data: overdueData, error } = await supabase
      .from('patient_schedules')
      .select(`
        id,
        next_due_date,
        schedule_history!inner(
          status,
          scheduled_date
        )
      `)
      .lt('next_due_date', today)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch overdue items: ${error.message}`);
    }

    // Filter overdue items that are not completed
    return overdueData?.filter(schedule => {
      const historyForDueDate = schedule.schedule_history.find(
        h => h.scheduled_date === schedule.next_due_date
      );
      return !historyForDueDate || historyForDueDate.status !== 'completed';
    }).length || 0;
  }

  private async calculateCompletionRates(today: string) {
    const { supabase } = this.deps;
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    const monthStart = new Date();
    monthStart.setDate(1); // Start of month

    const dates = {
      today,
      weekStart: weekStart.toISOString().split('T')[0],
      monthStart: monthStart.toISOString().split('T')[0]
    };

    // Today's completion rate
    const todayRate = await this.calculatePeriodCompletionRate(dates.today, dates.today);
    
    // This week's completion rate
    const weekRate = await this.calculatePeriodCompletionRate(dates.weekStart, dates.today);
    
    // This month's completion rate
    const monthRate = await this.calculatePeriodCompletionRate(dates.monthStart, dates.today);

    return {
      today: Math.round(todayRate * 10) / 10,
      thisWeek: Math.round(weekRate * 10) / 10,
      thisMonth: Math.round(monthRate * 10) / 10
    };
  }

  private async calculatePeriodCompletionRate(startDate: string, endDate: string): Promise<number> {
    const { supabase } = this.deps;
    
    const { data: scheduled, error } = await supabase
      .from('schedule_history')
      .select('id, status')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);

    if (error) {
      throw new Error(`Failed to fetch scheduled history: ${error.message}`);
    }

    const completed = scheduled?.filter(s => s.status === 'completed').length || 0;
    const total = scheduled?.length || 0;
    
    return total > 0 ? (completed / total) * 100 : 0;
  }

  private async getRecentActivity(): Promise<RecentActivity[]> {
    const { supabase } = this.deps;
    
    const { data, error } = await supabase
      .from('schedule_history')
      .select(`
        id,
        scheduled_date,
        completed_date,
        actual_completion_date,
        status,
        notes,
        patient_schedules!inner (
          id,
          patients!inner (
            name,
            patient_number
          ),
          items!inner (
            name,
            type
          )
        )
      `)
      .eq('status', 'completed')
      .order('completed_date', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch recent activity: ${error.message}`);
    }

    return data?.map(item => ({
      id: item.id,
      patientName: item.patient_schedules.patients.name,
      patientNumber: item.patient_schedules.patients.patient_number,
      itemName: item.patient_schedules.items.name,
      itemType: item.patient_schedules.items.type as 'test' | 'injection',
      scheduledDate: item.scheduled_date,
      completedDate: item.completed_date,
      actualCompletionDate: item.actual_completion_date,
      status: item.status as 'pending' | 'completed' | 'skipped',
      notes: item.notes
    })) || [];
  }

  private async getUpcomingSchedules(): Promise<UpcomingSchedule[]> {
    const { supabase } = this.deps;
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('patient_schedules')
      .select(`
        id,
        next_due_date,
        patients!inner (
          name,
          patient_number
        ),
        items!inner (
          name,
          type
        ),
        schedule_history (
          status,
          scheduled_date
        )
      `)
      .gte('next_due_date', today)
      .eq('is_active', true)
      .order('next_due_date')
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch upcoming schedules: ${error.message}`);
    }

    return data?.filter(schedule => {
      // Only include schedules that are not yet completed
      const historyForDueDate = schedule.schedule_history.find(
        h => h.scheduled_date === schedule.next_due_date
      );
      return !historyForDueDate || historyForDueDate.status !== 'completed';
    }).map(schedule => {
      const dueDate = new Date(schedule.next_due_date);
      const todayDate = new Date(today);
      const daysDue = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: schedule.id,
        patientName: (schedule.patients as any)?.name || '',
        patientNumber: (schedule.patients as any)?.patient_number || '',
        itemName: (schedule.items as any)?.name || '',
        itemType: ((schedule.items as any)?.type as 'test' | 'injection') || 'test',
        dueDate: schedule.next_due_date,
        daysDue
      };
    }) || [];
  }

  private async getWeeklyCompletionRates(): Promise<WeeklyCompletionRate[]> {
    const { supabase } = this.deps;
    const rates: WeeklyCompletionRate[] = [];
    
    // Get data for the last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];
      
      const { data: weekData, error } = await supabase
        .from('schedule_history')
        .select('id, status')
        .gte('scheduled_date', startStr)
        .lte('scheduled_date', endStr);

      if (error) {
        console.error(`Failed to fetch weekly data for week ${i}:`, error);
        continue;
      }

      const totalScheduled = weekData?.length || 0;
      const completedCount = weekData?.filter(s => s.status === 'completed').length || 0;
      const completionRate = totalScheduled > 0 ? (completedCount / totalScheduled) * 100 : 0;

      rates.push({
        week: startStr,
        weekLabel: this.formatWeekLabel(weekStart, weekEnd) || `${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일-${weekEnd.getDate()}일`,
        completionRate: Math.round(completionRate),
        completedCount,
        totalScheduled
      });
    }
    
    return rates;
  }

  private async getItemTypeDistribution(): Promise<ItemTypeDistribution[]> {
    const { supabase } = this.deps;
    
    // Get counts for each item type from recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('schedule_history')
      .select(`
        id,
        patient_schedules!inner (
          items!inner (
            type
          )
        )
      `)
      .gte('scheduled_date', startDate);

    if (error) {
      throw new Error(`Failed to fetch item type distribution: ${error.message}`);
    }

    const testCount = data?.filter(
      item => (item.patient_schedules as any)?.items?.type === 'test'
    ).length || 0;
    
    const injectionCount = data?.filter(
      item => (item.patient_schedules as any)?.items?.type === 'injection'
    ).length || 0;

    const total = testCount + injectionCount;
    
    return [
      {
        type: 'test',
        count: testCount,
        percentage: total > 0 ? (testCount / total) * 100 : 0
      },
      {
        type: 'injection',
        count: injectionCount,
        percentage: total > 0 ? (injectionCount / total) * 100 : 0
      }
    ];
  }

  private formatWeekLabel(start: Date, end: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startMonth = months[start.getMonth()];
    const endMonth = months[end.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    } else {
      return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
    }
  }
}

// Factory function for creating dashboard service with dependencies
export const createDashboardService = (supabase: SupabaseClient): DashboardService => {
  return new DashboardService({ supabase });
};