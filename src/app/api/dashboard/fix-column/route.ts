import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createPureClient();

    // Check if the actual_completion_date column exists using a proper SQL query
    let columnExists = false;
    
    try {
      // Use SQL query to check column existence in information_schema
      const checkColumnSql = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_history' 
        AND column_name = 'actual_completion_date'
        AND table_schema = 'public';
      `;
      
      const { data: columnData, error: checkError } = await supabase
        .rpc('exec_sql', { sql: checkColumnSql })
        .maybeSingle();

      if (!checkError && columnData && Array.isArray(columnData) && columnData.length > 0) {
        columnExists = true;
      }
    } catch (error) {
      // Fallback: try a direct select to test if column exists
      try {
        const { error: selectError } = await supabase
          .from('schedule_history')
          .select('actual_completion_date')
          .limit(1);
        
        // If no error, column exists
        if (!selectError) {
          columnExists = true;
        } else if (selectError.code === '42703') {
          // PostgreSQL error code for "column does not exist"
          columnExists = false;
        } else {
          throw selectError;
        }
      } catch (fallbackError) {
        console.error('Error checking column existence:', fallbackError);
        return NextResponse.json(
          { 
            error: 'Failed to check column existence',
            message: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // If column exists, return success without adding it
    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: 'Column actual_completion_date already exists in schedule_history table',
        columnExists: true
      });
    }

    // Column doesn't exist, add it using raw SQL execution
    const { error: alterError } = await supabase
      .from('schedule_history')
      .select('1')
      .limit(0);

    // Execute the ALTER TABLE command using direct SQL
    const alterSql = `ALTER TABLE schedule_history ADD COLUMN IF NOT EXISTS actual_completion_date DATE;`;
    
    try {
      // Use Supabase's built-in SQL execution
      const { error: sqlError } = await supabase
        .rpc('exec_sql', { sql: alterSql })
        .maybeSingle();

      if (sqlError) {
        console.error('Error adding column via RPC:', sqlError);
        return NextResponse.json(
          { 
            error: 'Failed to add actual_completion_date column',
            message: sqlError.message
          },
          { status: 500 }
        );
      }
    } catch (rpcError) {
      console.error('RPC not available, column may need to be added via migration:', rpcError);
      return NextResponse.json(
        { 
          error: 'Unable to add column via API',
          message: 'Please use a database migration to add the actual_completion_date column',
          suggestion: 'Run: ALTER TABLE schedule_history ADD COLUMN IF NOT EXISTS actual_completion_date DATE;'
        },
        { status: 500 }
      );
    }

    // Verify the column was added successfully
    let verificationPassed = false;
    
    try {
      // Re-check if column exists after adding it
      const verifyColumnSql = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_history' 
        AND column_name = 'actual_completion_date'
        AND table_schema = 'public';
      `;
      
      const { data: verifyData, error: verifyError } = await supabase
        .rpc('exec_sql', { sql: verifyColumnSql })
        .maybeSingle();

      if (!verifyError && verifyData && Array.isArray(verifyData) && verifyData.length > 0) {
        verificationPassed = true;
      }
    } catch (error) {
      // Fallback verification using direct select
      try {
        const { error: selectError } = await supabase
          .from('schedule_history')
          .select('actual_completion_date')
          .limit(1);
        
        if (!selectError) {
          verificationPassed = true;
        }
      } catch (fallbackError) {
        console.warn('Could not verify column addition:', fallbackError);
      }
    }

    if (!verificationPassed) {
      return NextResponse.json(
        { 
          error: 'Failed to verify column addition',
          message: 'Column may not have been added successfully'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Column actual_completion_date added successfully to schedule_history table',
      columnExists: true
    });

  } catch (error) {
    console.error('Fix column API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix column',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createPureClient();

    // Check if the actual_completion_date column exists using a proper SQL query
    let columnExists = false;
    
    try {
      // Use SQL query to check column existence in information_schema
      const checkColumnSql = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_history' 
        AND column_name = 'actual_completion_date'
        AND table_schema = 'public';
      `;
      
      const { data: columnData, error: checkError } = await supabase
        .rpc('exec_sql', { sql: checkColumnSql })
        .maybeSingle();

      if (!checkError && columnData && Array.isArray(columnData) && columnData.length > 0) {
        columnExists = true;
      }
    } catch (error) {
      // Fallback: try a direct select to test if column exists
      try {
        const { error: selectError } = await supabase
          .from('schedule_history')
          .select('actual_completion_date')
          .limit(1);
        
        // If no error, column exists
        if (!selectError) {
          columnExists = true;
        } else if (selectError.code === '42703') {
          // PostgreSQL error code for "column does not exist"
          columnExists = false;
        } else {
          throw selectError;
        }
      } catch (fallbackError) {
        console.error('Error checking column existence:', fallbackError);
        return NextResponse.json(
          { 
            error: 'Failed to check column existence',
            message: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      columnExists,
      tableName: 'schedule_history',
      columnName: 'actual_completion_date',
      message: columnExists 
        ? 'Column actual_completion_date exists in schedule_history table'
        : 'Column actual_completion_date does not exist in schedule_history table'
    });

  } catch (error) {
    console.error('Check column API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check column',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}