import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Handles GET requests to retrieve all active items from the database.
 *
 * Queries the 'items' table for records where 'is_active' is true, ordering results by 'type' and 'name'. Returns the items as a JSON array, or an error response with details if the query fails.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all items
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('name');
    
    if (error) {
      console.error('Supabase Error Details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch items',
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }
    
    console.log('Successfully fetched items:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/items:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}