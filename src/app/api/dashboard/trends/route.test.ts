/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import { GET } from './route';
import type { DashboardTrendsResponse } from '@/types/dashboard';

// Mock dependencies
const mockDashboardService = {
  getStats: jest.fn(),
  getRecentActivity: jest.fn(),
  getRecentData: jest.fn(),
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

describe('/api/dashboard/trends', () => {
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
    it('should return dashboard trends with completion rates and distributions', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: [
          { week: '2024-01-01', weekLabel: 'Jan 1-7', completionRate: 85.5, completedCount: 17, totalScheduled: 20 },
          { week: '2024-01-08', weekLabel: 'Jan 8-14', completionRate: 92.0, completedCount: 23, totalScheduled: 25 },
          { week: '2024-01-15', weekLabel: 'Jan 15-21', completionRate: 78.3, completedCount: 15, totalScheduled: 19 },
          { week: '2024-01-22', weekLabel: 'Jan 22-28', completionRate: 88.7, completedCount: 21, totalScheduled: 24 }
        ],
        itemTypeDistribution: [
          { type: 'test', count: 45, percentage: 60.0 },
          { type: 'injection', count: 30, percentage: 40.0 }
        ],
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockTrendsResponse);
      expect(mockCreateDashboardService).toHaveBeenCalledTimes(1);
      expect(mockDashboardService.getTrends).toHaveBeenCalledTimes(1);
    });

    it('should handle empty trends data correctly', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: [],
        itemTypeDistribution: []
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockTrendsResponse);
      expect(responseData.weeklyCompletionRates).toHaveLength(0);
      expect(responseData.itemTypeDistribution).toHaveLength(0);
    });

    it('should handle single data point trends', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: [
          { week: '2024-01-01', weekLabel: 'Jan 1-7', completionRate: 100.0, completedCount: 5, totalScheduled: 5 }
        ],
        itemTypeDistribution: [
          { type: 'test', count: 1, percentage: 100.0 }
        ]
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates[0].completionRate).toBe(100.0);
      expect(responseData.itemTypeDistribution[0].percentage).toBe(100.0);
    });

    it('should handle trends with zero completion rates', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: [
          { week: '2024-01-01', weekLabel: 'Jan 1-7', completionRate: 0.0, completedCount: 0, totalScheduled: 10 },
          { week: '2024-01-08', weekLabel: 'Jan 8-14', completionRate: 0.0, completedCount: 0, totalScheduled: 8 }
        ],
        itemTypeDistribution: [
          { type: 'test', count: 0, percentage: 0.0 },
          { type: 'injection', count: 0, percentage: 0.0 }
        ]
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates.every((w: any) => w.completionRate === 0.0)).toBe(true);
      expect(responseData.itemTypeDistribution.every((i: any) => i.count === 0)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle service layer errors', async () => {
      const testError = new Error('Service error');
      mockDashboardService.getTrends.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard trends'
      );
    });

    it('should handle supabase client creation error', async () => {
      const testError = new Error('Supabase connection failed');
      mockCreatePureClient.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard trends'
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
        'Failed to fetch dashboard trends'
      );
    });

    it('should handle data processing errors', async () => {
      const testError = new TypeError('Data processing failed');
      mockDashboardService.getTrends.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard trends'
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      const testError = new RangeError('Unexpected error');
      mockDashboardService.getTrends.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch dashboard trends'
      );
    });
  });

  describe('Integration', () => {
    it('should create dashboard service with supabase client', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: [],
        itemTypeDistribution: []
      };

      const mockSupabaseClient = { mock: 'client' };
      mockCreatePureClient.mockResolvedValue(mockSupabaseClient);
      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      await GET();

      expect(mockCreatePureClient).toHaveBeenCalledTimes(1);
      expect(mockCreateDashboardService).toHaveBeenCalledWith(mockSupabaseClient);
      expect(mockDashboardService.getTrends).toHaveBeenCalledTimes(1);
    });

    it('should return proper NextResponse format', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: [{ week: '2024-01-01', weekLabel: 'Jan 1-7', completionRate: 50.0, completedCount: 5, totalScheduled: 10 }],
        itemTypeDistribution: [{ type: 'test', count: 1, percentage: 100.0 }]
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should handle complex trend data structures', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: Array.from({ length: 52 }, (_, i) => ({
          week: `2024-${String(Math.floor(i / 4) + 1).padStart(2, '0')}-${String((i % 4) * 7 + 1).padStart(2, '0')}`,
          weekLabel: `Week ${i + 1}`,
          completionRate: Math.random() * 100,
          completedCount: Math.floor(Math.random() * 20),
          totalScheduled: 20
        })),
        itemTypeDistribution: [
          { type: 'test', count: 234, percentage: 55.8 },
          { type: 'injection', count: 186, percentage: 44.2 }
        ]
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates).toHaveLength(52);
      expect(responseData.itemTypeDistribution).toHaveLength(2);
    });
  });
});