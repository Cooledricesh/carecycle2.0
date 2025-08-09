/**
 * Dashboard Feature Types
 * Types specific to the dashboard feature
 */

import type {
  DashboardStatsResponse,
  DashboardRecentResponse,
  DashboardTrendsResponse,
  RecentActivity,
  UpcomingSchedule,
  WeeklyCompletionRate,
  ItemTypeDistribution,
  DashboardErrorResponse
} from '@/types/dashboard';

// Re-export shared dashboard types from global types
export type {
  DashboardStatsResponse,
  DashboardRecentResponse,
  DashboardTrendsResponse,
  RecentActivity,
  UpcomingSchedule,
  WeeklyCompletionRate,
  ItemTypeDistribution,
  DashboardErrorResponse
} from '@/types/dashboard';

// Dashboard-specific component props types
export interface DashboardHooksData {
  stats?: DashboardStatsResponse;
  recent?: DashboardRecentResponse;
  trends?: DashboardTrendsResponse;
  isLoading: boolean;
  error: Error | null;
}

export interface ChartProps {
  data: WeeklyCompletionRate[] | ItemTypeDistribution[];
}

// Dashboard service dependencies interface
export interface DashboardServiceDependencies {
  supabase: any; // Should be properly typed with Supabase client type
}