/**
 * Dashboard Data Hooks
 * Custom hooks for dashboard data fetching with React Query
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { dashboardClient, dashboardQueryKeys } from '../api/dashboard-client';
import type { 
  DashboardStatsResponse, 
  DashboardRecentResponse, 
  DashboardTrendsResponse 
} from '@/types/dashboard';

/**
 * Hook for dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardQueryKeys.stats(),
    queryFn: async () => {
      try {
        const data = await dashboardClient.getStats();
        
        // Save successful data for offline use
        if (typeof window !== 'undefined') {
          const { DashboardOfflineManager } = await import('../lib/dashboard-offline');
          // We'll save when we have all three datasets
        }
        
        return data;
      } catch (error) {
        // Try to load offline data if request fails
        if (typeof window !== 'undefined') {
          const { DashboardOfflineManager } = await import('../lib/dashboard-offline');
          const offlineData = await DashboardOfflineManager.loadOfflineData();
          if (offlineData) {
            console.info('[Dashboard] Using offline stats data');
            return offlineData.stats;
          }
        }
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Data is fresh for 20 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for recent dashboard data (activity + upcoming schedules)
 */
export function useDashboardRecent() {
  return useQuery({
    queryKey: dashboardQueryKeys.recent(),
    queryFn: dashboardClient.getRecent,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook for dashboard trends data
 */
export function useDashboardTrends() {
  return useQuery({
    queryKey: dashboardQueryKeys.trends(),
    queryFn: dashboardClient.getTrends,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Data is fresh for 4 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Combined hook that provides loading states for all dashboard data
 */
export function useDashboardStatus() {
  const statsQuery = useDashboardStats();
  const recentQuery = useDashboardRecent();
  const trendsQuery = useDashboardTrends();

  return {
    isLoading: statsQuery.isLoading || recentQuery.isLoading || trendsQuery.isLoading,
    isError: statsQuery.isError || recentQuery.isError || trendsQuery.isError,
    error: statsQuery.error || recentQuery.error || trendsQuery.error,
    hasData: Boolean(statsQuery.data && recentQuery.data && trendsQuery.data),
    refetch: () => {
      statsQuery.refetch();
      recentQuery.refetch();
      trendsQuery.refetch();
    }
  };
}

/**
 * Type exports for better TypeScript support
 */
export type DashboardStatsQuery = UseQueryResult<DashboardStatsResponse, Error>;
export type DashboardRecentQuery = UseQueryResult<DashboardRecentResponse, Error>;
export type DashboardTrendsQuery = UseQueryResult<DashboardTrendsResponse, Error>;