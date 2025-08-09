/**
 * Dashboard API Client Layer
 * Centralized fetch logic for dashboard data with TanStack Query integration
 */

import { 
  DashboardStatsResponse, 
  DashboardRecentResponse, 
  DashboardTrendsResponse 
} from '@/types/dashboard';

import { 
  createApiClientError, 
  parseApiError, 
  handleNetworkError,
  logError 
} from '@/lib/api-client-errors';

import type { ApiClientError } from '@/types/api/common';

/**
 * Generic fetch wrapper with centralized error handling
 */
async function apiRequest<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      let errorData;
      
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      
      const error = parseApiError(response, errorData);
      logError(error, { endpoint });
      throw error;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // If it's already our custom error, just re-throw
    if (error instanceof Error && error.name === 'ApiClientError') {
      throw error;
    }
    
    // Handle network and other errors
    const networkError = handleNetworkError(error);
    logError(networkError, { endpoint });
    throw networkError;
  }
}

/**
 * Dashboard API Client
 */
export const dashboardClient = {
  /**
   * Fetch dashboard statistics
   */
  async getStats(): Promise<DashboardStatsResponse> {
    return apiRequest<DashboardStatsResponse>('/api/dashboard/stats');
  },

  /**
   * Fetch recent activity and upcoming schedules
   */
  async getRecent(): Promise<DashboardRecentResponse> {
    return apiRequest<DashboardRecentResponse>('/api/dashboard/recent');
  },

  /**
   * Fetch dashboard trends data
   */
  async getTrends(): Promise<DashboardTrendsResponse> {
    return apiRequest<DashboardTrendsResponse>('/api/dashboard/trends');
  }
};

/**
 * Query keys for React Query
 */
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardQueryKeys.all, 'stats'] as const,
  recent: () => [...dashboardQueryKeys.all, 'recent'] as const,
  trends: () => [...dashboardQueryKeys.all, 'trends'] as const,
} as const;