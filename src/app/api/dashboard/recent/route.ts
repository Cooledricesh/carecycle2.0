import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createErrorResponse } from '@/lib/api-errors';

import type { RecentActivity, UpcomingSchedule, DashboardRecentResponse } from '@/types/dashboard';
import { RecentActivityRowSchema } from '@/types/dashboard';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const today = new Date().toISOString().split('T')[0]!;
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().split('T')[0]!;

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

    // Validate and transform recent activity data with strong typing
    const parsedRecentActivityData = RecentActivityRowSchema.array().parse(recentActivityData ?? []);
    const recentActivity: RecentActivity[] = parsedRecentActivityData.map((item) => ({
      id: item.id,
      patientName: item.patient_schedules?.patients?.name || '',
      patientNumber: item.patient_schedules?.patients?.patient_number || '',
      itemName: item.patient_schedules?.items?.name || '',
      itemType: item.patient_schedules?.items?.type ?? 'test',
      scheduledDate: item.scheduled_date,
      completedDate: item.completed_date,
      actualCompletionDate: item.actual_completion_date ?? null,
      status: item.status,
      notes: item.notes ?? null,
    }));

    // Get upcoming schedules for next 7 days with their completion status
    // Using a LEFT JOIN to get schedule history in a single query
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

    // Get all schedule IDs for batch history lookup
    const scheduleIds = (upcomingData || []).map((schedule: any) => schedule.id);
    
    // Batch fetch all schedule history in a single query
    const { data: historyData, error: historyError } = await supabase
      .from('schedule_history')
      .select('patient_schedule_id, scheduled_date, status')
      .in('patient_schedule_id', scheduleIds)
      .gte('scheduled_date', today)
      .lte('scheduled_date', nextWeekDate);

    if (historyError) {
      throw new Error(`Failed to fetch schedule history: ${historyError.message}`);
    }

    // Create a map for quick history lookup
    const historyMap = new Map<string, string>();
    (historyData || []).forEach((history: any) => {
      const key = `${history.patient_schedule_id}-${history.scheduled_date}`;
      historyMap.set(key, history.status);
    });

    // Process upcoming schedules with completion status from the map
    const upcomingSchedules: UpcomingSchedule[] = (upcomingData || [])
      .map((schedule: any) => {
        const historyKey = `${schedule.id}-${schedule.next_due_date}`;
        const historyStatus = historyMap.get(historyKey);
        
        // Skip if already completed
        if (historyStatus === 'completed') {
          return null;
        }

        const dueDate = new Date(schedule.next_due_date);
        const todayDate = new Date(today);
        const daysDue = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: schedule.id,
          patientName: schedule.patients?.name || '',
          patientNumber: schedule.patients?.patient_number || '',
          itemName: schedule.items?.name || '',
          itemType: (schedule.items?.type || 'test') as 'test' | 'injection',
          dueDate: schedule.next_due_date,
          daysDue
        };
      })
      .filter((schedule): schedule is UpcomingSchedule => schedule !== null)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const response: DashboardRecentResponse = {
      recentActivity,
      upcomingSchedules
    };

    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(
      error,
      500,
      'Failed to fetch recent dashboard data'
    );
  }
}