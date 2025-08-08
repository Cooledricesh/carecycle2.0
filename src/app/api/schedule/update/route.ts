import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { scheduleId, isCompleted, notes, actualCompletionDate } = body;
    
    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    // Call the stored procedure to handle the update
    const { error } = await supabase.rpc('handle_schedule_completion', {
      p_schedule_id: scheduleId,
      p_is_completed: isCompleted,
      p_notes: notes || null,
      p_actual_date: actualCompletionDate || null
    });

    if (error) {
      console.error('Error updating schedule:', error);
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}