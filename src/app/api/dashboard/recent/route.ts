import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

import type { RecentActivity, UpcomingSchedule, DashboardRecentResponse } from '@/types/dashboard';

export async function GET() {
  try {
    const supabase = await createPureClient();
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().split('T')[0];

    // Get last 10 completed schedules with patient and item details
    const { data: recentActivityData, error: recentError } = await supabase
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
      .not('completed_date', 'is', null)
      .eq('status', 'completed')
      .order('completed_date', { ascending: false })
      .limit(10);

    if (recentError) {
      throw new Error(`Failed to fetch recent activity: ${recentError.message}`);
    }

    // Transform recent activity data
    const recentActivity: RecentActivity[] = recentActivityData?.map(item => ({
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

    // Get upcoming schedules for next 7 days
    const { data: upcomingData, error: upcomingError } = await supabase
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
        )
      `)
      .gte('next_due_date', today)
      .lte('next_due_date', nextWeekDate)
      .eq('is_active', true)
      .order('next_due_date', { ascending: true });

    if (upcomingError) {
      throw new Error(`Failed to fetch upcoming schedules: ${upcomingError.message}`);
    }

    // Filter out schedules that are already completed
    const upcomingSchedulesWithCompletion = await Promise.all(
      (upcomingData || []).map(async (schedule) => {
        const { data: historyData } = await supabase
          .from('schedule_history')
          .select('status')
          .eq('patient_schedule_id', schedule.id)
          .eq('scheduled_date', schedule.next_due_date)
          .single();

        const isCompleted = historyData?.status === 'completed';
        
        if (isCompleted) {
          return null; // Filter out completed schedules
        }

        const dueDate = new Date(schedule.next_due_date);
        const todayDate = new Date(today);
        const daysDue = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: schedule.id,
          patientName: schedule.patients.name,
          patientNumber: schedule.patients.patient_number,
          itemName: schedule.items.name,
          itemType: schedule.items.type as 'test' | 'injection',
          dueDate: schedule.next_due_date,
          daysDue
        };
      })
    );

    // Filter out null values and sort by due date
    const upcomingSchedules: UpcomingSchedule[] = upcomingSchedulesWithCompletion
      .filter((schedule): schedule is UpcomingSchedule => schedule !== null)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const response: DashboardRecentResponse = {
      recentActivity,
      upcomingSchedules
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard recent API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch recent dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}