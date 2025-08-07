import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Supabase connection...');
    console.log('Environment variables check:');
    console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
    console.log('- PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Not set');
    console.log('- SECRET_KEY:', process.env.SUPABASE_SECRET_KEY ? 'Set' : 'Not set');
    
    const supabase = await createClient();
    
    // Test basic connection with a simple query
    const { data, error } = await supabase
      .from('items')
      .select('count')
      .single();
    
    if (error) {
      console.error('Connection test failed:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      return NextResponse.json({
        success: false,
        error: 'Connection test failed',
        details: {
          message: error.message,
          code: error.code,
          hint: error.hint
        },
        env: {
          url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          publishable_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          secret_key_set: !!process.env.SUPABASE_SECRET_KEY
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      items_count: data?.count || 0,
      env: {
        url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        publishable_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        secret_key_set: !!process.env.SUPABASE_SECRET_KEY
      }
    });
    
  } catch (error) {
    console.error('Unexpected error in test connection:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      env: {
        url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        publishable_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        secret_key_set: !!process.env.SUPABASE_SECRET_KEY
      }
    }, { status: 500 });
  }
}