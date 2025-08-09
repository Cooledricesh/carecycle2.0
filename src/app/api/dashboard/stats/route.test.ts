/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import { GET } from './route';
import type { DashboardStatsResponse } from '@/types/dashboard';

// Mock dependencies
const mockDashboardService = {
  getStats: jest.fn(),
  getRecentActivity: jest.fn(),
  getTrends: jest.fn(),
};

const mockCreateDashboardService = jest.fn().mockReturnValue(mockDashboardService);
const mockCreatePureClient = jest.fn().mockResolvedValue({});
const mockCreateErrorResponse = jest.fn();

jest.mock('@/services/dashboard.service', () => ({
  createDashboardService: (...args: any[]) => mockCreateDashboardService(...args),
}));

jest.mock('@/lib/supabase/server', () => ({
  createPureClient: () => mockCreatePureClient(),
}));

jest.mock('@/lib/api-errors', () => ({
  createErrorResponse: (...args: any[]) => mockCreateErrorResponse(...args),
}));

describe('/api/dashboard/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateErrorResponse.mockReturnValue(
      NextResponse.json({ error: 'Test error' }, { status: 500 })
    );
    // Reset implementations
    mockCreatePureClient.mockResolvedValue({});
    mockCreateDashboardService.mockReturnValue(mockDashboardService);
  });

  describe('Successful GET request', () => {
    it('should return dashboard statistics with all metrics', async () => {
      const mockStatsResponse: DashboardStatsResponse = {
        totalPatients: 25,
        todayScheduled: 5,
        completionRates: {
          today: 66.7,
          thisWeek: 75.0,
          thisMonth: 80.0,
        },
        overdueItems: 1,
      };

      mockDashboardService.getStats.mockResolvedValue(mockStatsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockStatsResponse);
      expect(mockCreateDashboardService).toHaveBeenCalledTimes(1);
      expect(mockDashboardService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should handle zero patient count correctly', async () => {
      const mockStatsResponse: DashboardStatsResponse = {
        totalPatients: 0,
        todayScheduled: 0,
        completionRates: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
        },
        overdueItems: 0,
      };

      mockDashboardService.getStats.mockResolvedValue(mockStatsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockStatsResponse);
      expect(mockDashboardService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should handle high completion rates correctly', async () => {
      const mockStatsResponse: DashboardStatsResponse = {
        totalPatients: 10,
        todayScheduled: 3,
        completionRates: {
          today: 100,
          thisWeek: 100,
          thisMonth: 100,
        },
        overdueItems: 0,
      };

      mockDashboardService.getStats.mockResolvedValue(mockStatsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.completionRates).toEqual({
        today: 100,
        thisWeek: 100,
        thisMonth: 100,
      });
    });
  });

  describe('Error handling', () => {
    it('should handle service layer errors', async () => {
      const testError = new Error('Service error');
      mockDashboardService.getStats.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard statistics'
      );
    });

    it('should handle supabase client creation error', async () => {
      const testError = new Error('Supabase connection failed');
      mockCreatePureClient.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard statistics'
      );
    });

    it('should handle service creation errors', async () => {
      const testError = new Error('Service creation failed');
      mockCreateDashboardService.mockImplementation(() => {
        throw testError;
      });

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard statistics'
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      const testError = new TypeError('Unexpected error');
      mockDashboardService.getStats.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard statistics'
      );
    });
  });

  describe('Integration', () => {
    it('should create dashboard service with supabase client', async () => {
      const mockStatsResponse: DashboardStatsResponse = {
        totalPatients: 1,
        todayScheduled: 1,
        completionRates: { today: 50, thisWeek: 50, thisMonth: 50 },
        overdueItems: 0,
      };

      const mockSupabaseClient = { mock: 'client' };
      mockCreatePureClient.mockResolvedValue(mockSupabaseClient);
      mockDashboardService.getStats.mockResolvedValue(mockStatsResponse);

      await GET();

      expect(mockCreatePureClient).toHaveBeenCalledTimes(1);
      expect(mockCreateDashboardService).toHaveBeenCalledWith(mockSupabaseClient);
      expect(mockDashboardService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should return proper NextResponse format', async () => {
      const mockStatsResponse: DashboardStatsResponse = {
        totalPatients: 5,
        todayScheduled: 2,
        completionRates: { today: 0, thisWeek: 25, thisMonth: 60 },
        overdueItems: 1,
      };

      mockDashboardService.getStats.mockResolvedValue(mockStatsResponse);

      const response = await GET();

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});