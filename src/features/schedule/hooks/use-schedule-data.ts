/**
 * Schedule Data Hooks
 * React Query hooks for schedule data management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { scheduleClient, scheduleQueryKeys } from '@/features/schedule/api/schedule-client';
import type { 
  Schedule,
  ScheduleHistory,
  ScheduleUpdateRequest,
  ScheduleUpdateResponse
} from '@/features/schedule/types';

/**
 * Hook to fetch today's schedules
 */
export function useTodaySchedules() {
  return useQuery({
    queryKey: scheduleQueryKeys.today(),
    queryFn: () => scheduleClient.getTodaySchedules(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to update schedule completion
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updateData: ScheduleUpdateRequest) => 
      scheduleClient.updateSchedule(updateData),
    
    onSuccess: (data: ScheduleUpdateResponse, variables: ScheduleUpdateRequest) => {
      // Invalidate and refetch today's schedules
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.today() });
      
      // Also invalidate dashboard data as it depends on schedule completion
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Show success message
      toast({
        title: 'Schedule Updated',
        description: variables.isCompleted 
          ? 'Schedule marked as completed successfully'
          : 'Schedule status updated successfully',
      });
    },
    
    onError: (error: any) => {
      console.error('Failed to update schedule:', error);
      
      // Show error message
      toast({
        title: 'Update Failed',
        description: error?.message || 'Failed to update schedule. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get schedule history
 * Note: This requires a new API endpoint
 */
export function useScheduleHistory(scheduleId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: scheduleQueryKeys.history(scheduleId),
    queryFn: () => scheduleClient.getScheduleHistory(scheduleId),
    enabled: enabled && Boolean(scheduleId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to get overdue schedules
 * Note: This requires a new API endpoint
 */
export function useOverdueSchedules() {
  return useQuery({
    queryKey: [...scheduleQueryKeys.all, 'overdue'],
    queryFn: () => scheduleClient.getOverdueSchedules(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to get upcoming schedules
 * Note: This requires a new API endpoint
 */
export function useUpcomingSchedules(daysAhead: number = 7) {
  return useQuery({
    queryKey: [...scheduleQueryKeys.all, 'upcoming', daysAhead],
    queryFn: () => scheduleClient.getUpcomingSchedules(daysAhead),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to get schedule statistics
 * Note: This requires a new API endpoint
 */
export function useScheduleStats() {
  return useQuery({
    queryKey: [...scheduleQueryKeys.all, 'stats'],
    queryFn: () => scheduleClient.getScheduleStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to prefetch schedule data
 * Useful for optimistic loading
 */
export function usePrefetchScheduleData() {
  const queryClient = useQueryClient();

  const prefetchTodaySchedules = () => {
    queryClient.prefetchQuery({
      queryKey: scheduleQueryKeys.today(),
      queryFn: () => scheduleClient.getTodaySchedules(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchScheduleHistory = (scheduleId: string) => {
    queryClient.prefetchQuery({
      queryKey: scheduleQueryKeys.history(scheduleId),
      queryFn: () => scheduleClient.getScheduleHistory(scheduleId),
      staleTime: 10 * 60 * 1000,
    });
  };

  return {
    prefetchTodaySchedules,
    prefetchScheduleHistory,
  };
}