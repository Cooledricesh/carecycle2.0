/**
 * Schedule API Client Tests
 * Testing the API client layer with proper error handling
 */

import { scheduleClient } from '../schedule-client';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the API error handling utilities
jest.mock('@/lib/api-client-errors', () => ({
  createApiClientError: jest.fn((message: string, statusCode: number) => ({
    name: 'ApiClientError',
    message,
    statusCode,
  })),
  parseApiError: jest.fn((response: Response, errorData: any) => ({
    name: 'ApiClientError',
    message: errorData?.error || 'API Error',
    statusCode: response.status,
  })),
  handleNetworkError: jest.fn((error: any) => ({
    name: 'ApiClientError',
    message: 'Network Error',
    statusCode: 0,
  })),
  logError: jest.fn(),
}));

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('scheduleClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('getTodaySchedules', () => {
    it('should fetch today\'s schedules successfully', async () => {
      const mockSchedules = [
        {
          scheduleId: '1',
          scheduledDate: '2025-08-08',
          patient: {
            id: 'p1',
            name: 'John Doe',
            patientNumber: 'P001',
          },
          item: {
            id: 'i1',
            name: 'Blood Test',
            type: 'test',
          },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchedules,
      } as Response);

      const result = await scheduleClient.getTodaySchedules();

      expect(mockFetch).toHaveBeenCalledWith('/api/schedule/today', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockSchedules);
    });

    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        error: 'Failed to fetch schedules',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse,
      } as Response);

      await expect(scheduleClient.getTodaySchedules()).rejects.toMatchObject({
        name: 'ApiClientError',
        message: 'Failed to fetch schedules',
        statusCode: 500,
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'));

      await expect(scheduleClient.getTodaySchedules()).rejects.toMatchObject({
        name: 'ApiClientError',
        message: 'Network Error',
        statusCode: 0,
      });
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule successfully', async () => {
      const updateData = {
        scheduleId: '1',
        isCompleted: true,
        notes: 'Completed successfully',
        actualCompletionDate: '2025-08-08',
      };

      const mockResponse = {
        success: true,
        message: 'Schedule marked as completed',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await scheduleClient.updateSchedule(updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/schedule/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const updateData = {
        scheduleId: '',
        isCompleted: true,
      };

      const errorResponse = {
        error: 'Invalid request data',
        details: [{ message: 'Schedule ID is required' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      } as Response);

      await expect(scheduleClient.updateSchedule(updateData)).rejects.toMatchObject({
        name: 'ApiClientError',
        statusCode: 400,
      });
    });
  });

  describe('getScheduleHistory', () => {
    it('should fetch schedule history successfully', async () => {
      const scheduleId = '1';
      const mockHistory = [
        {
          id: 'h1',
          scheduleId: '1',
          scheduledDate: '2025-08-08',
          completedDate: '2025-08-08',
          actualCompletionDate: '2025-08-08',
          status: 'completed',
          notes: 'Completed on time',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      } as Response);

      const result = await scheduleClient.getScheduleHistory(scheduleId);

      expect(mockFetch).toHaveBeenCalledWith(`/api/schedule/${scheduleId}/history`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getScheduleStats', () => {
    it('should fetch schedule statistics successfully', async () => {
      const mockStats = {
        todayTotal: 5,
        todayCompleted: 3,
        todayCompletionRate: 60.0,
        overdueCount: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      } as Response);

      const result = await scheduleClient.getScheduleStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/schedule/stats', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockStats);
    });
  });
});