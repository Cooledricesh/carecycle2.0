import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createScheduleService } from '@/services/schedule.service';
import { handleApiError } from '@/lib/error-handler';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/schedule/today',
    },
    async (span) => {
      try {
        const supabase = await createClient();
        const scheduleService = createScheduleService(supabase);
        
        span.setAttribute('endpoint', '/api/schedule/today');
        
        const schedules = await scheduleService.getTodaySchedules();
        
        span.setAttribute('schedules.count', schedules.length);
        
        return NextResponse.json(schedules);
      } catch (error) {
        console.error('Error fetching today\'s schedules:', error);
        Sentry.captureException(error);
        
        return handleApiError(error, {
          defaultMessage: 'Failed to fetch today\'s schedules',
          context: 'schedule.getTodaySchedules'
        });
      }
    }
  );
}