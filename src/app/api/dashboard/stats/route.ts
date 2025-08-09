import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createErrorResponse } from '@/lib/api-errors';
import { createDashboardService } from '@/services/dashboard.service';

/**
 * Dashboard Stats API Route
 * Thin controller that delegates business logic to service layer
 */
export async function GET() {
  try {
    const supabase = await createPureClient();
    const dashboardService = createDashboardService(supabase);
    
    const stats = await dashboardService.getStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    return createErrorResponse(
      error,
      500,
      'Failed to fetch dashboard statistics'
    );
  }
}