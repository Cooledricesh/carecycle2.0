import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

import type { WeeklyCompletionRate, ItemTypeDistribution, DashboardTrendsResponse } from '@/types/dashboard';

export async function GET() {
  try {
    const supabase = await createPureClient();

    // Calculate weekly completion rates for last 4 weeks
    const weeklyRates = await calculateWeeklyCompletionRates(supabase);

    // Calculate item type distribution
    const itemDistribution = await calculateItemTypeDistribution(supabase);

    const response: DashboardTrendsResponse = {
      weeklyCompletionRates: weeklyRates,
      itemTypeDistribution: itemDistribution
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard trends API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function calculateWeeklyCompletionRates(supabase: any): Promise<WeeklyCompletionRate[]> {
  const weeklyRates: WeeklyCompletionRate[] = [];
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (7 * i) - weekStart.getDay()); // Monday of that week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday of that week

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    try {
      // Get all scheduled items for this week
      const { data: weekScheduled, error: weekError } = await supabase
        .from('schedule_history')
        .select('id, status')
        .gte('scheduled_date', weekStartStr)
        .lte('scheduled_date', weekEndStr);

      if (weekError) {
        throw new Error(`Failed to fetch week scheduled data: ${weekError.message}`);
      }

      const totalScheduled = weekScheduled?.length || 0;
      const completedCount = weekScheduled?.filter(s => s.status === 'completed').length || 0;
      const completionRate = totalScheduled > 0 ? (completedCount / totalScheduled) * 100 : 0;

      // Format week label
      const weekLabel = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`;

      weeklyRates.push({
        week: weekStartStr,
        weekLabel,
        completionRate: Math.round(completionRate * 10) / 10,
        completedCount,
        totalScheduled
      });
    } catch (error) {
      console.error(`Failed to calculate completion rate for week ${weekStartStr}:`, error);
      // Add empty data point to maintain consistent array length
      weeklyRates.push({
        week: weekStartStr,
        weekLabel: `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`,
        completionRate: 0,
        completedCount: 0,
        totalScheduled: 0
      });
    }
  }

  return weeklyRates;
}

async function calculateItemTypeDistribution(supabase: any): Promise<ItemTypeDistribution[]> {
  try {
    // Get distribution based on active patient schedules
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('patient_schedules')
      .select(`
        id,
        items!inner (
          type
        )
      `)
      .eq('is_active', true);

    if (scheduleError) {
      throw new Error(`Failed to fetch schedule data for distribution: ${scheduleError.message}`);
    }

    // Count by type
    const typeCounts = scheduleData?.reduce((acc: Record<string, number>, schedule) => {
      const type = schedule.items.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}) || {};

    const totalItems = Object.values(typeCounts).reduce((sum: number, count: number) => sum + count, 0);

    // Convert to ItemTypeDistribution format
    const distribution: ItemTypeDistribution[] = ['test', 'injection'].map(type => {
      const count = typeCounts[type] || 0;
      const percentage = totalItems > 0 ? (count / totalItems) * 100 : 0;
      
      return {
        type: type as 'test' | 'injection',
        count,
        percentage: Math.round(percentage * 10) / 10
      };
    });

    return distribution;
  } catch (error) {
    console.error('Failed to calculate item type distribution:', error);
    return [
      { type: 'test', count: 0, percentage: 0 },
      { type: 'injection', count: 0, percentage: 0 }
    ];
  }
}

function formatDateShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}