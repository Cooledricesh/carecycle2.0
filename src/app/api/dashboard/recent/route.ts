import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createErrorResponse } from '@/lib/api-errors';
import { createDashboardService } from '@/services/dashboard.service';

/**
 * Dashboard Recent Data API Route
 * Thin controller that delegates business logic to service layer
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const dashboardService = createDashboardService(supabase);
    
    const recentData = await dashboardService.getRecentData();
    
    return NextResponse.json(recentData);
  } catch (error) {
    return createErrorResponse(
      error,
      500,
      'Failed to fetch recent dashboard data'
    );
  }
}