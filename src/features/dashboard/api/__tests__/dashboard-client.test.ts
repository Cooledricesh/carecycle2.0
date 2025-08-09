/**
 * Dashboard API Client Tests
 * Tests for API client layer with mocked fetch
 */

import { dashboardClient } from '../dashboard-client';
import { HTTP_STATUS } from '@/types/api/common';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Dashboard API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should fetch dashboard stats successfully', async () => {
      const mockStatsData = {
        totalPatients: 150,
        todayScheduled: 25,
        completionRates: {
          today: 85.5,
          thisWeek: 78.2,
          thisMonth: 82.1
        },
        overdueItems: 3
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: HTTP_STATUS.OK,
        json: jest.fn().mockResolvedValue(mockStatsData),
      } as any);

      const result = await dashboardClient.getStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/stats', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockStatsData);
    });

    it('should handle HTTP errors with JSON error response', async () => {
      const mockErrorData = {
        error: 'Internal Server Error',
        message: 'Database connection failed'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue(mockErrorData),
      } as any);

      await expect(dashboardClient.getStats()).rejects.toThrow('Database connection failed');
    });

    it('should handle HTTP errors without JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.NOT_FOUND,
        statusText: 'Not Found',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any);

      await expect(dashboardClient.getStats()).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(dashboardClient.getStats()).rejects.toThrow('Network error');
    });
  });

  describe('getRecent', () => {
    it('should fetch recent dashboard data successfully', async () => {
      const mockRecentData = {
        recentActivity: [
          {
            id: '1',
            patientName: 'John Doe',
            patientNumber: 'P001',
            itemName: 'Blood Test',
            itemType: 'test',
            scheduledDate: '2025-01-08',
            completedDate: '2025-01-08',
            actualCompletionDate: null,
            status: 'completed',
            notes: null
          }
        ],
        upcomingSchedules: [
          {
            id: '2',
            patientName: 'Jane Smith',
            patientNumber: 'P002',
            itemName: 'Vaccination',
            itemType: 'injection',
            dueDate: '2025-01-09',
            daysDue: 1
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: HTTP_STATUS.OK,
        json: jest.fn().mockResolvedValue(mockRecentData),
      } as any);

      const result = await dashboardClient.getRecent();

      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/recent', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockRecentData);
      expect(result.recentActivity).toHaveLength(1);
      expect(result.upcomingSchedules).toHaveLength(1);
    });

    it('should handle unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.UNAUTHORIZED,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ error: 'Unauthorized' }),
      } as any);

      await expect(dashboardClient.getRecent()).rejects.toThrow();
    });
  });

  describe('getTrends', () => {
    it('should fetch trends data successfully', async () => {
      const mockTrendsData = {
        weeklyCompletionRates: [
          {
            week: '2025-01-06',
            weekLabel: 'Jan 6-12',
            completionRate: 85.5,
            completedCount: 17,
            totalScheduled: 20
          }
        ],
        itemTypeDistribution: [
          { type: 'test', count: 60, percentage: 60.0 },
          { type: 'injection', count: 40, percentage: 40.0 }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: HTTP_STATUS.OK,
        json: jest.fn().mockResolvedValue(mockTrendsData),
      } as any);

      const result = await dashboardClient.getTrends();

      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/trends', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockTrendsData);
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(dashboardClient.getStats()).rejects.toThrow('Request timed out');
    });

    it('should handle abort errors', async () => {
      const abortError = new Error('Request was cancelled');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(dashboardClient.getStats()).rejects.toThrow('Request was cancelled');
    });

    it('should handle malformed JSON responses in error scenarios', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: HTTP_STATUS.BAD_REQUEST,
        statusText: 'Bad Request',
        json: jest.fn().mockRejectedValue(new Error('Malformed JSON')),
      } as any);

      await expect(dashboardClient.getStats()).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should re-throw existing ApiClientError instances', async () => {
      const customError = new Error('Custom API error');
      customError.name = 'ApiClientError';
      mockFetch.mockRejectedValueOnce(customError);

      await expect(dashboardClient.getStats()).rejects.toThrow('Custom API error');
      await expect(dashboardClient.getStats()).rejects.toHaveProperty('name', 'ApiClientError');
    });
  });

  describe('Request configuration', () => {
    it('should include correct headers in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: HTTP_STATUS.OK,
        json: jest.fn().mockResolvedValue({}),
      } as any);

      await dashboardClient.getStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/dashboard/stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });
});