import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/api-errors';

import type { DashboardStatsResponse } from '@/types/dashboard';
import type { TypedSupabaseClient, CompletionRateDates } from '@/types/supabase-helpers';

export async function GET() {
  try {
    const supabase = await createPureClient();
    const today = new Date().toISOString().split('T')[0];
    
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

    // Get overdue items (next_due_date < today and no completion in schedule_history)
    const { data: overdueData, error: overdueError } = await supabase
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

    if (overdueError) {
      throw new Error(`Failed to fetch overdue items: ${overdueError.message}`);
    }

    // Filter overdue items that are not completed
    const overdueItems = overdueData?.filter(schedule => {
      const historyForDueDate = schedule.schedule_history.find(
        h => h.scheduled_date === schedule.next_due_date
      );
      return !historyForDueDate || historyForDueDate.status !== 'completed';
    }).length || 0;

    // Calculate completion rates
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    const monthStart = new Date();
    monthStart.setDate(1); // Start of month

    const completionRates = await calculateCompletionRates(supabase, {
      today,
      weekStart: weekStart.toISOString().split('T')[0],
      monthStart: monthStart.toISOString().split('T')[0]
    });

    const response: DashboardStatsResponse = {
      totalPatients: totalPatients || 0,
      todayScheduled: todayScheduled || 0,
      completionRates,
      overdueItems
    };

    return NextResponse.json(response);
  } catch (error) {
    return createErrorResponse(
      error,
      500,
      'Failed to fetch dashboard statistics'
    );
  }
}

async function calculateCompletionRates(supabase: TypedSupabaseClient, dates: CompletionRateDates) {
  try {
    // Today's completion rate
    const { data: todayScheduled, error: todayScheduledError } = await supabase
      .from('schedule_history')
      .select('id, status')
      .eq('scheduled_date', dates.today);

    if (todayScheduledError) {
      throw new Error(`Failed to fetch today's scheduled history: ${todayScheduledError.message}`);
    }

    const todayCompleted = todayScheduled?.filter(s => s.status === 'completed').length || 0;
    const todayTotal = todayScheduled?.length || 0;
    const todayRate = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

    // This week's completion rate
    const { data: weekScheduled, error: weekScheduledError } = await supabase
      .from('schedule_history')
      .select('id, status')
      .gte('scheduled_date', dates.weekStart)
      .lte('scheduled_date', dates.today);

    if (weekScheduledError) {
      throw new Error(`Failed to fetch week's scheduled history: ${weekScheduledError.message}`);
    }

    const weekCompleted = weekScheduled?.filter(s => s.status === 'completed').length || 0;
    const weekTotal = weekScheduled?.length || 0;
    const weekRate = weekTotal > 0 ? (weekCompleted / weekTotal) * 100 : 0;

    // This month's completion rate
    const { data: monthScheduled, error: monthScheduledError } = await supabase
      .from('schedule_history')
      .select('id, status')
      .gte('scheduled_date', dates.monthStart)
      .lte('scheduled_date', dates.today);

    if (monthScheduledError) {
      throw new Error(`Failed to fetch month's scheduled history: ${monthScheduledError.message}`);
    }

    const monthCompleted = monthScheduled?.filter(s => s.status === 'completed').length || 0;
    const monthTotal = monthScheduled?.length || 0;
    const monthRate = monthTotal > 0 ? (monthCompleted / monthTotal) * 100 : 0;

    return {
      today: Math.round(todayRate * 10) / 10, // Round to 1 decimal place
      thisWeek: Math.round(weekRate * 10) / 10,
      thisMonth: Math.round(monthRate * 10) / 10
    };
  } catch (error) {
    console.error('Failed to calculate completion rates:', error);
    return { today: 0, thisWeek: 0, thisMonth: 0 };
  }
}