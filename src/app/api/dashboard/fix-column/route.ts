import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createPureClient();
    
    // Run migration to add actual_completion_date column
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        -- Add actual_completion_date column to schedule_history table if it doesn't exist
        ALTER TABLE schedule_history 
        ADD COLUMN IF NOT EXISTS actual_completion_date DATE;
        
        -- Update existing completed records to have actual_completion_date same as completed_date
        UPDATE schedule_history 
        SET actual_completion_date = completed_date 
        WHERE status = 'completed' AND actual_completion_date IS NULL AND completed_date IS NOT NULL;
      `
    });

    if (error) {
      // If RPC doesn't exist, try direct approach
      // First check if column exists
      const { data: columns, error: columnError } = await supabase
        .from('schedule_history')
        .select('*')
        .limit(1);
      
      if (columnError?.message?.includes('actual_completion_date')) {
        return NextResponse.json({ 
          error: 'Column does not exist and cannot be added via API. Please run migration directly in Supabase dashboard.',
          migration: `
            ALTER TABLE schedule_history 
            ADD COLUMN IF NOT EXISTS actual_completion_date DATE;
            
            UPDATE schedule_history 
            SET actual_completion_date = completed_date 
            WHERE status = 'completed' AND actual_completion_date IS NULL AND completed_date IS NOT NULL;
          `
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Column added successfully',
      data 
    });
  } catch (error) {
    console.error('Fix column error:', error);
    return NextResponse.json(
      { error: 'Failed to fix column' },
      { status: 500 }
    );
  }
}