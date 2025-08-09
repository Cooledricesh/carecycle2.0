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
          { week: 'Week 1', completionRate: 85.5 },
          { week: 'Week 2', completionRate: 92.0 },
          { week: 'Week 3', completionRate: 78.3 },
          { week: 'Week 4', completionRate: 88.7 }
        ],
        itemTypeDistribution: [
          { itemType: 'Blood Pressure', count: 45, percentage: 30.0 },
          { itemType: 'Medication', count: 38, percentage: 25.3 },
          { itemType: 'Exercise', count: 35, percentage: 23.3 },
          { itemType: 'Diet', count: 32, percentage: 21.3 }
        ],
        monthlyPatientGrowth: [
          { month: 'Jan', patients: 120 },
          { month: 'Feb', patients: 135 },
          { month: 'Mar', patients: 142 },
          { month: 'Apr', patients: 158 }
        ]
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
        itemTypeDistribution: [],
        monthlyPatientGrowth: []
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockTrendsResponse);
      expect(responseData.weeklyCompletionRates).toHaveLength(0);
      expect(responseData.itemTypeDistribution).toHaveLength(0);
      expect(responseData.monthlyPatientGrowth).toHaveLength(0);
    });

    it('should handle single data point trends', async () => {
      const mockTrendsResponse: DashboardTrendsResponse = {
        weeklyCompletionRates: [
          { week: 'Week 1', completionRate: 100.0 }
        ],
        itemTypeDistribution: [
          { itemType: 'Blood Pressure', count: 1, percentage: 100.0 }
        ],
        monthlyPatientGrowth: [
          { month: 'Jan', patients: 1 }
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
          { week: 'Week 1', completionRate: 0.0 },
          { week: 'Week 2', completionRate: 0.0 }
        ],
        itemTypeDistribution: [
          { itemType: 'Blood Pressure', count: 0, percentage: 0.0 },
          { itemType: 'Medication', count: 0, percentage: 0.0 }
        ],
        monthlyPatientGrowth: [
          { month: 'Jan', patients: 0 },
          { month: 'Feb', patients: 0 }
        ]
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates.every(w => w.completionRate === 0.0)).toBe(true);
      expect(responseData.itemTypeDistribution.every(i => i.count === 0)).toBe(true);
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
        itemTypeDistribution: [],
        monthlyPatientGrowth: []
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
        weeklyCompletionRates: [{ week: 'Week 1', completionRate: 50.0 }],
        itemTypeDistribution: [{ itemType: 'Test', count: 1, percentage: 100.0 }],
        monthlyPatientGrowth: [{ month: 'Jan', patients: 10 }]
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
          week: `Week ${i + 1}`,
          completionRate: Math.random() * 100
        })),
        itemTypeDistribution: [
          { itemType: 'Blood Pressure', count: 234, percentage: 32.5 },
          { itemType: 'Medication', count: 189, percentage: 26.2 },
          { itemType: 'Exercise', count: 156, percentage: 21.6 },
          { itemType: 'Diet', count: 142, percentage: 19.7 }
        ],
        monthlyPatientGrowth: Array.from({ length: 12 }, (_, i) => ({
          month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
          patients: 100 + (i * 15) + Math.floor(Math.random() * 20)
        }))
      };

      mockDashboardService.getTrends.mockResolvedValue(mockTrendsResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates).toHaveLength(52);
      expect(responseData.itemTypeDistribution).toHaveLength(4);
      expect(responseData.monthlyPatientGrowth).toHaveLength(12);
    });
  });
});