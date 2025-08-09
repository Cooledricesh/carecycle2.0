import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createScheduleService } from '@/services/schedule.service';
import { ScheduleUpdateRequestSchema } from '@/features/schedule/types';
import { handleApiError } from '@/lib/error-handler';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/schedule/update',
    },
    async (span) => {
      try {
        const supabase = await createClient();
        const scheduleService = createScheduleService(supabase);
        
        const body = await request.json();
        span.setAttribute('endpoint', '/api/schedule/update');
        
        // Validate request data
        const validationResult = ScheduleUpdateRequestSchema.safeParse(body);
        if (!validationResult.success) {
          return NextResponse.json(
            { error: 'Invalid request data', details: validationResult.error.issues },
            { status: 400 }
          );
        }
        
        const updateData = validationResult.data;
        span.setAttribute('schedule.id', updateData.scheduleId);
        span.setAttribute('schedule.isCompleted', updateData.isCompleted);
        
        await scheduleService.updateScheduleCompletion(updateData);
        
        return NextResponse.json({ 
          success: true,
          message: updateData.isCompleted 
            ? 'Schedule marked as completed'
            : 'Schedule status updated'
        });
      } catch (error) {
        console.error('Error updating schedule:', error);
        Sentry.captureException(error);
        
        return handleApiError(error, {
          defaultMessage: 'Failed to update schedule',
          context: 'schedule.updateScheduleCompletion'
        });
      }
    }
  );
}