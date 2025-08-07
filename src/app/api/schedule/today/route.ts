import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
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
      console.error('Error fetching today\'s schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch today\'s schedules' },
        { status: 500 }
      );
    }

    // Format the response to match the requirements
    const schedules = (data || []).map(schedule => ({
      scheduleId: schedule.id,
      scheduledDate: schedule.next_due_date,
      patient: {
        id: schedule.patient?.id,
        name: schedule.patient?.name,
        patientNumber: schedule.patient?.patient_number
      },
      item: {
        id: schedule.item?.id,
        name: schedule.item?.name,
        type: schedule.item?.type
      }
    }));

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}