import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

/**
 * Test endpoint to verify dashboard API functionality and database connectivity
 * GET /api/dashboard/test
 */
export async function GET() {
  try {
    const supabase = await createPureClient();
    const results: Record<string, any> = {};

    // Test database connectivity
    const { data: connectTest, error: connectError } = await supabase
      .from('patients')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    results.databaseConnection = {
      success: !connectError,
      error: connectError?.message || null
    };

    if (connectError) {
      return NextResponse.json({
        success: false,
        message: 'Database connection failed',
        results
      }, { status: 500 });
    }

    // Test each table exists and has expected structure
    const tables = ['patients', 'items', 'patient_schedules', 'schedule_history'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        results[`table_${table}`] = {
          exists: !error,
          hasData: (data && data.length > 0),
          error: error?.message || null
        };
      } catch (err) {
        results[`table_${table}`] = {
          exists: false,
          hasData: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }

    // Test sample dashboard queries
    try {
      // Test stats query
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      results.sampleQueries = {
        totalPatientsQuery: {
          success: true,
          count: totalPatients || 0
        }
      };

      // Test recent activity query
      const { data: recentData, error: recentError } = await supabase
        .from('schedule_history')
        .select(`
          id,
          scheduled_date,
          status,
          patient_schedules!inner (
            patients!inner (name),
            items!inner (name, type)
          )
        `)
        .limit(5);

      results.sampleQueries.recentActivityQuery = {
        success: !recentError,
        count: recentData?.length || 0,
        error: recentError?.message || null
      };

    } catch (err) {
      results.sampleQueries = {
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }

    // Test date calculations
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    results.dateCalculations = {
      today,
      weekStart: weekStartStr,
      timezoneOffset: new Date().getTimezoneOffset()
    };

    return NextResponse.json({
      success: true,
      message: 'Dashboard API test completed',
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('Dashboard API test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Dashboard API test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}