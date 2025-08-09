/**
 * Schedule Data Hooks Tests
 * Testing React Query hooks for schedule data management
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodaySchedules, useUpdateSchedule } from '../use-schedule-data';
import { scheduleClient } from '../../api/schedule-client';

// Mock the API client
jest.mock('../../api/schedule-client', () => ({
  scheduleClient: {
    getTodaySchedules: jest.fn(),
    updateSchedule: jest.fn(),
  },
  scheduleQueryKeys: {
    all: ['schedule'],
    today: () => ['schedule', 'today'],
  },
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const mockScheduleClient = scheduleClient as jest.Mocked<typeof scheduleClient>;

describe('Schedule Data Hooks', () => {
  let queryClient: QueryClient;
  
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useTodaySchedules', () => {
    it('should fetch today\'s schedules successfully', async () => {
      const mockSchedules = [
        {
          scheduleId: '1',
          scheduledDate: '2025-08-08',
          patient: { id: 'p1', name: 'John Doe', patientNumber: 'P001' },
          item: { id: 'i1', name: 'Blood Test', type: 'test' as const },
        },
      ];

      mockScheduleClient.getTodaySchedules.mockResolvedValue(mockSchedules);

      const { result } = renderHook(() => useTodaySchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSchedules);
      expect(mockScheduleClient.getTodaySchedules).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to fetch schedules');
      mockScheduleClient.getTodaySchedules.mockRejectedValue(error);

      const { result } = renderHook(() => useTodaySchedules(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useUpdateSchedule', () => {
    it('should update schedule successfully', async () => {
      const mockResponse = { success: true, message: 'Schedule updated' };
      mockScheduleClient.updateSchedule.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useUpdateSchedule(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        scheduleId: '1',
        isCompleted: true,
        notes: 'Completed successfully',
      };

      result.current.mutate(updateData);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockScheduleClient.updateSchedule).toHaveBeenCalledWith(updateData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockScheduleClient.updateSchedule.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateSchedule(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        scheduleId: '1',
        isCompleted: true,
      };

      result.current.mutate(updateData);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });
});