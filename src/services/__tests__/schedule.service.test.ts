/**
 * Schedule Service Tests
 * Testing the business logic layer with proper mocking
 */

import { ScheduleService } from '../schedule.service';
import { createMockSupabaseClient } from '@/lib/test-utils';

describe('ScheduleService', () => {
  let scheduleService: ScheduleService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    scheduleService = new ScheduleService({ supabase: mockSupabase });
    jest.clearAllMocks();
  });

  describe('getTodaySchedules', () => {
    it('should return today\'s schedules successfully', async () => {
      const mockData = [
        {
          id: '1',
          next_due_date: '2025-08-08',
          patient: {
            id: 'p1',
            name: 'John Doe',
            patient_number: 'P001',
          },
          item: {
            id: 'i1',
            name: 'Blood Test',
            type: 'test',
          },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await scheduleService.getTodaySchedules();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
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
      });
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(scheduleService.getTodaySchedules()).rejects.toThrow(
        'Failed to fetch today\'s schedules: Database error'
      );
    });

    it('should handle null patient or item data gracefully', async () => {
      const mockData = [
        {
          id: '1',
          next_due_date: '2025-08-08',
          patient: null,
          item: null,
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await scheduleService.getTodaySchedules();

      expect(result[0].patient).toEqual({
        id: '',
        name: '',
        patientNumber: '',
      });
      expect(result[0].item).toEqual({
        id: '',
        name: '',
        type: 'test',
      });
    });
  });

  describe('updateScheduleCompletion', () => {
    it('should update schedule completion successfully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: null,
      });

      const updateData = {
        scheduleId: '1',
        isCompleted: true,
        notes: 'Completed successfully',
        actualCompletionDate: '2025-08-08',
      };

      await scheduleService.updateScheduleCompletion(updateData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('handle_schedule_completion', {
        p_schedule_id: '1',
        p_is_completed: true,
        p_notes: 'Completed successfully',
        p_actual_date: '2025-08-08',
      });
    });

    it('should handle stored procedure errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'Stored procedure error' },
      });

      const updateData = {
        scheduleId: '1',
        isCompleted: true,
      };

      await expect(scheduleService.updateScheduleCompletion(updateData)).rejects.toThrow(
        'Failed to update schedule: Stored procedure error'
      );
    });

    it('should throw error for missing schedule ID', async () => {
      const updateData = {
        scheduleId: '',
        isCompleted: true,
      };

      await expect(scheduleService.updateScheduleCompletion(updateData)).rejects.toThrow(
        'Schedule ID is required'
      );
    });
  });

  describe('getScheduleHistory', () => {
    it('should return schedule history successfully', async () => {
      const mockData = [
        {
          id: 'h1',
          patient_schedule_id: '1',
          scheduled_date: '2025-08-08',
          completed_date: '2025-08-08T10:30:00Z',
          actual_completion_date: '2025-08-08',
          status: 'completed',
          notes: 'Completed on time',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await scheduleService.getScheduleHistory('1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'h1',
        scheduleId: '1',
        scheduledDate: '2025-08-08',
        completedDate: '2025-08-08T10:30:00Z',
        actualCompletionDate: '2025-08-08',
        status: 'completed',
        notes: 'Completed on time',
      });
    });

    it('should throw error for missing schedule ID', async () => {
      await expect(scheduleService.getScheduleHistory('')).rejects.toThrow(
        'Schedule ID is required'
      );
    });
  });

  describe('getOverdueSchedules', () => {
    it('should return overdue schedules successfully', async () => {
      const mockData = [
        {
          id: '1',
          next_due_date: '2025-08-07',
          patient: {
            id: 'p1',
            name: 'John Doe',
            patient_number: 'P001',
          },
          item: {
            id: 'i1',
            name: 'Blood Test',
            type: 'test',
          },
          schedule_history: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await scheduleService.getOverdueSchedules();

      expect(result).toHaveLength(1);
      expect(result[0].scheduleId).toBe('1');
    });

    it('should filter out completed schedules', async () => {
      const mockData = [
        {
          id: '1',
          next_due_date: '2025-08-07',
          patient: { id: 'p1', name: 'John Doe', patient_number: 'P001' },
          item: { id: 'i1', name: 'Blood Test', type: 'test' },
          schedule_history: [
            { status: 'completed', scheduled_date: '2025-08-07' },
          ],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await scheduleService.getOverdueSchedules();

      expect(result).toHaveLength(0);
    });
  });

  describe('getScheduleStats', () => {
    it('should return schedule statistics successfully', async () => {
      // Mock today's schedules
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { status: 'completed' },
              { status: 'completed' },
              { status: 'pending' },
            ],
            error: null,
          }),
        }),
      });

      // Mock the service's getOverdueSchedules method
      jest.spyOn(scheduleService, 'getOverdueSchedules').mockResolvedValue([]);

      const result = await scheduleService.getScheduleStats();

      expect(result).toEqual({
        todayTotal: 3,
        todayCompleted: 2,
        todayCompletionRate: 66.7,
        overdueCount: 0,
      });
    });

    it('should handle zero schedules gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      jest.spyOn(scheduleService, 'getOverdueSchedules').mockResolvedValue([]);

      const result = await scheduleService.getScheduleStats();

      expect(result).toEqual({
        todayTotal: 0,
        todayCompleted: 0,
        todayCompletionRate: 0,
        overdueCount: 0,
      });
    });
  });
});