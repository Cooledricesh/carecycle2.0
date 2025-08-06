import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateNextDueDate } from '@/lib/schedule-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientNumber, name, schedules } = body;
    
    // Validate input
    if (!patientNumber || !name || !schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Prepare schedules with calculated next due dates
    const preparedSchedules = schedules.map(schedule => ({
      item_id: schedule.itemId,
      first_date: schedule.firstDate,
      next_due_date: calculateNextDueDate(
        schedule.firstDate,
        {
          value: schedule.periodValue,
          unit: schedule.periodUnit
        }
      ).toISOString().split('T')[0]
    }));
    
    // Call RPC function to register patient with schedules
    const { data, error } = await supabase.rpc('register_patient_with_schedules', {
      p_patient_number: patientNumber,
      p_name: name,
      p_schedules: preparedSchedules
    });
    
    if (error) {
      console.error('Error registering patient:', error);
      
      // Handle specific errors
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Patient with this number already exists' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('Invalid item_id')) {
        return NextResponse.json(
          { error: 'Invalid item selected' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to register patient' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all patients with their schedules
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        patient_schedules (
          *,
          items (
            name,
            type,
            period_value,
            period_unit
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching patients:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}