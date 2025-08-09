/**
 * Schedule API Client Layer
 * Centralized fetch logic for schedule data with TanStack Query integration
 */

import { 
  Schedule,
  ScheduleHistory,
  ScheduleUpdateRequest,
  ScheduleUpdateResponse,
  TodaySchedulesResponse,
  scheduleQueryKeys
} from '@/features/schedule/types';

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
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
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
 * Schedule API Client
 */
export const scheduleClient = {
  /**
   * Fetch today's scheduled items
   */
  async getTodaySchedules(): Promise<Schedule[]> {
    const response = await apiRequest<Schedule[]>('/api/schedule/today');
    return response;
  },

  /**
   * Update schedule completion status
   */
  async updateSchedule(updateData: ScheduleUpdateRequest): Promise<ScheduleUpdateResponse> {
    const response = await apiRequest<ScheduleUpdateResponse>('/api/schedule/update', {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
    return response;
  },

  /**
   * Get schedule history for a specific schedule
   * Note: This endpoint doesn't exist yet but would be useful for future features
   */
  async getScheduleHistory(scheduleId: string): Promise<ScheduleHistory[]> {
    const response = await apiRequest<ScheduleHistory[]>(`/api/schedule/${scheduleId}/history`);
    return response;
  },

  /**
   * Get overdue schedules
   * Note: This endpoint doesn't exist yet but would be useful for future features
   */
  async getOverdueSchedules(): Promise<Schedule[]> {
    const response = await apiRequest<Schedule[]>('/api/schedule/overdue');
    return response;
  },

  /**
   * Get upcoming schedules for the next N days
   * Note: This endpoint doesn't exist yet but would be useful for future features
   */
  async getUpcomingSchedules(daysAhead: number = 7): Promise<Schedule[]> {
    const response = await apiRequest<Schedule[]>(`/api/schedule/upcoming?days=${daysAhead}`);
    return response;
  },

  /**
   * Get schedule statistics
   * Note: This endpoint doesn't exist yet but would be useful for analytics
   */
  async getScheduleStats(): Promise<{
    todayTotal: number;
    todayCompleted: number;
    todayCompletionRate: number;
    overdueCount: number;
  }> {
    const response = await apiRequest<{
      todayTotal: number;
      todayCompleted: number;
      todayCompletionRate: number;
      overdueCount: number;
    }>('/api/schedule/stats');
    return response;
  }
};

/**
 * Export query keys for consistency
 */
export { scheduleQueryKeys };