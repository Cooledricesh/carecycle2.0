import { createClient } from '@supabase/supabase-js';

// Supabase test client setup - using service role key for testing to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bqilsbkjqzqnxnvjssif.supabase.co';
// For tests, we need the service role key to bypass RLS
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 
                    'sb_secret_yImuLCsoA5ayWwNpXpDH1Q_u16QzZPy';

export const supabaseTestClient = createClient(supabaseUrl, supabaseKey);

// Test data cleanup
export async function cleanupTestData() {
  try {
    // Delete test notification logs
    await supabaseTestClient
      .from('notification_logs')
      .delete()
      .like('metadata->>test', 'true');

    // Delete test schedule history
    await supabaseTestClient
      .from('schedule_history')
      .delete()
      .like('notes', '%TEST%');

    // Delete test patient schedules
    await supabaseTestClient
      .from('patient_schedules')
      .delete()
      .in('patient_id', (
        await supabaseTestClient
          .from('patients')
          .select('id')
          .like('name', 'TEST%')
      ).data?.map(p => p.id) || []);

    // Delete test items
    await supabaseTestClient
      .from('items')
      .delete()
      .like('name', 'TEST%');

    // Delete test patients
    await supabaseTestClient
      .from('patients')
      .delete()
      .like('name', 'TEST%');

    // Delete test notification settings
    await supabaseTestClient
      .from('user_notification_settings')
      .delete()
      .like('user_email', 'test@%');

  } catch (error) {
    console.error('Failed to cleanup test data:', error);
  }
}

// Create test patient with schedule
export async function createTestPatientWithSchedule() {
  try {
    // Create test patient
    const { data: patient, error: patientError } = await supabaseTestClient
      .from('patients')
      .insert({
        patient_number: 'TEST-' + Date.now(),
        name: 'TEST 환자 ' + Date.now()
      })
      .select()
      .single();

    if (patientError) throw patientError;

    // Create test item (injection)
    const { data: item, error: itemError } = await supabaseTestClient
      .from('items')
      .insert({
        name: 'TEST 주사제 ' + Date.now(),
        type: 'injection',
        period_value: 4,
        period_unit: 'weeks',
        is_active: true
      })
      .select()
      .single();

    if (itemError) throw itemError;

    // Create patient schedule with upcoming due date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: schedule, error: scheduleError } = await supabaseTestClient
      .from('patient_schedules')
      .insert({
        patient_id: patient.id,
        item_id: item.id,
        first_date: new Date().toISOString().split('T')[0],
        next_due_date: tomorrow.toISOString().split('T')[0],
        is_active: true,
        notification_days_before: 1
      })
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    // Create schedule history entry
    await supabaseTestClient
      .from('schedule_history')
      .insert({
        patient_schedule_id: schedule.id,
        scheduled_date: tomorrow.toISOString().split('T')[0],
        status: 'pending',
        notes: 'TEST - Auto-generated for E2E testing'
      });

    return {
      patient,
      item,
      schedule
    };
  } catch (error) {
    console.error('Failed to create test patient with schedule:', error);
    throw error;
  }
}

// Create test notification settings
export async function createTestNotificationSettings(email: string = 'test@example.com') {
  try {
    const { data, error } = await supabaseTestClient
      .from('user_notification_settings')
      .upsert({
        user_email: email,
        notification_enabled: true,
        email_notifications: true,
        push_notifications: false,
        notification_time: '09:00:00'
      }, {
        onConflict: 'user_email'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to create test notification settings:', error);
    throw error;
  }
}

// Mark schedule as notified
export async function markScheduleAsNotified(scheduleId: string) {
  try {
    const { error } = await supabaseTestClient
      .from('patient_schedules')
      .update({ is_notified: true })
      .eq('id', scheduleId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to mark schedule as notified:', error);
    throw error;
  }
}

// Get upcoming schedules for testing
export async function getUpcomingSchedules() {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    const { data, error } = await supabaseTestClient
      .from('patient_schedules')
      .select(`
        id,
        next_due_date,
        is_notified,
        patient:patients!patient_id (
          name,
          patient_number
        ),
        item:items!item_id (
          name,
          type
        )
      `)
      .gte('next_due_date', today.toISOString().split('T')[0])
      .lte('next_due_date', threeDaysFromNow.toISOString().split('T')[0])
      .eq('is_active', true)
      .order('next_due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to get upcoming schedules:', error);
    return [];
  }
}