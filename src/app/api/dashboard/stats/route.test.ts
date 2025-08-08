/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import { GET } from './route';
import {
  createMockSupabaseResponse,
  createMockDatabaseError,
  getTestDates,
  mockConsole,
  mockEnvironmentVariables,
} from '@/lib/test-utils';

// Mock dependencies
const mockSupabaseClient = {
  from: jest.fn(),
};

const mockCreatePureClient = jest.fn().mockResolvedValue(mockSupabaseClient);
const mockCreateErrorResponse = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createPureClient: () => mockCreatePureClient(),
}));

jest.mock('@/lib/api-errors', () => ({
  createErrorResponse: (...args: any[]) => mockCreateErrorResponse(...args),
}));

// Mock Date for consistent testing
const FIXED_DATE = new Date('2024-12-20T12:00:00Z');
const OriginalDate = Date;

global.Date = class extends Date {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(FIXED_DATE);
    } else {
      super(...args as []);
    }
  }
  
  static now() {
    return FIXED_DATE.getTime();
  }
} as any;

describe('/api/dashboard/stats', () => {
  const consoleSpies = mockConsole();
  
  mockEnvironmentVariables({
    NODE_ENV: 'test',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateErrorResponse.mockReturnValue(
      NextResponse.json({ error: 'Test error' }, { status: 500 })
    );
  });

  afterAll(() => {
    global.Date = OriginalDate;
  });

  describe('Successful GET request', () => {
    it('should return dashboard statistics with all metrics', async () => {
      const testDates = getTestDates();
      
      // Mock patient count query
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 25))
        })
      };

      // Mock today's scheduled query
      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
          })
        })
      };

      // Mock overdue items query
      const mockOverdueData = [
        {
          id: 'schedule-1',
          next_due_date: '2024-12-19',
          schedule_history: [
            { status: 'pending', scheduled_date: '2024-12-19' }
          ]
        },
        {
          id: 'schedule-2', 
          next_due_date: '2024-12-18',
          schedule_history: [
            { status: 'completed', scheduled_date: '2024-12-18' }
          ]
        }
      ];
      
      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockOverdueData))
          })
        })
      };

      // Mock completion rate queries
      const mockTodayHistoryData = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'pending' }
      ];
      const mockWeekHistoryData = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'completed' },
        { id: '4', status: 'pending' }
      ];
      const mockMonthHistoryData = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'completed' },
        { id: '4', status: 'completed' },
        { id: '5', status: 'pending' }
      ];

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockTodayHistoryData)),
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse(mockWeekHistoryData))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockMonthHistoryData))
          })
        })
      };

      // Setup mock calls in sequence
      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery) // patients count
        .mockReturnValueOnce(mockTodayQuery) // today scheduled
        .mockReturnValueOnce(mockOverdueQuery) // overdue items
        .mockReturnValueOnce(mockHistoryQuery) // today completion
        .mockReturnValueOnce(mockHistoryQuery) // week completion  
        .mockReturnValueOnce(mockHistoryQuery); // month completion

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        totalPatients: 25,
        todayScheduled: 5,
        completionRates: {
          today: 66.7, // 2/3 * 100, rounded to 1 decimal
          thisWeek: 75.0, // 3/4 * 100
          thisMonth: 80.0, // 4/5 * 100
        },
        overdueItems: 1, // Only schedule-1 has pending status
      });
    });

    it('should handle zero patient count correctly', async () => {
      // Mock empty responses
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 0))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 0))
          })
        })
      };

      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([])),
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery)
        .mockReturnValueOnce(mockOverdueQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        totalPatients: 0,
        todayScheduled: 0,
        completionRates: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
        },
        overdueItems: 0,
      });
    });

    it('should calculate completion rates correctly with 100% completion', async () => {
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 10))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 3))
          })
        })
      };

      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      // All completed
      const mockAllCompletedData = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' }
      ];

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockAllCompletedData)),
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse(mockAllCompletedData))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockAllCompletedData))
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery)
        .mockReturnValueOnce(mockOverdueQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(responseData.completionRates).toEqual({
        today: 100,
        thisWeek: 100,
        thisMonth: 100,
      });
    });
  });

  describe('Error handling', () => {
    it('should handle patients count query error', async () => {
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(
            createMockSupabaseResponse(null, createMockDatabaseError('Connection failed'))
          )
        })
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockPatientsQuery);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Failed to fetch patients count: Connection failed'),
        500,
        'Failed to fetch dashboard statistics'
      );
    });

    it('should handle today scheduled query error', async () => {
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 10))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(
              createMockSupabaseResponse(null, createMockDatabaseError('Table not found'))
            )
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error("Failed to fetch today's scheduled items: Table not found"),
        500,
        'Failed to fetch dashboard statistics'
      );
    });

    it('should handle overdue items query error', async () => {
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 10))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
          })
        })
      };

      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(
              createMockSupabaseResponse(null, createMockDatabaseError('Query timeout'))
            )
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery)
        .mockReturnValueOnce(mockOverdueQuery);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Failed to fetch overdue items: Query timeout'),
        500,
        'Failed to fetch dashboard statistics'
      );
    });

    it('should handle completion rates calculation error gracefully', async () => {
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 10))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
          })
        })
      };

      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      // Mock completion rate query to fail
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(
            createMockSupabaseResponse(null, createMockDatabaseError('Network error'))
          )
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery)
        .mockReturnValueOnce(mockOverdueQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const response = await GET();
      const responseData = await response.json();

      // Should complete successfully with default completion rates
      expect(response.status).toBe(200);
      expect(responseData.completionRates).toEqual({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      });
      expect(consoleSpies.error).toHaveBeenCalledWith(
        'Failed to calculate completion rates:', 
        expect.any(Error)
      );
    });

    it('should handle supabase client creation error', async () => {
      mockCreatePureClient.mockRejectedValueOnce(new Error('Supabase connection failed'));

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Supabase connection failed'),
        500,
        'Failed to fetch dashboard statistics'
      );
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Unexpected error'),
        500,
        'Failed to fetch dashboard statistics'
      );
    });
  });

  describe('Date calculations', () => {
    it('should use correct date formatting for queries', async () => {
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 10))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
          })
        })
      };

      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([])),
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery)
        .mockReturnValueOnce(mockOverdueQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      await GET();

      // Verify today's date is used correctly
      expect(mockTodayQuery.select().eq().eq).toHaveBeenCalledWith('next_due_date', '2024-12-20');
      
      // Verify overdue query uses correct date
      expect(mockOverdueQuery.select().lt).toHaveBeenCalledWith('next_due_date', '2024-12-20');
      
      // Verify completion rate queries use correct dates
      expect(mockHistoryQuery.select().eq).toHaveBeenCalledWith('scheduled_date', '2024-12-20');
      
      // Week start should be Sunday of current week (2024-12-15)
      const weekCall = mockHistoryQuery.select().gte().lte.mock.calls[0];
      expect(weekCall[0]).toBe('2024-12-20'); // today
      
      // Month start should be first day of month (2024-12-01) 
      const monthCall = mockHistoryQuery.select().gte().lte.mock.calls[1];
      expect(monthCall[0]).toBe('2024-12-20'); // today
    });
  });

  describe('Data filtering and calculations', () => {
    it('should correctly filter overdue items that are not completed', async () => {
      const mockOverdueData = [
        {
          id: 'schedule-1',
          next_due_date: '2024-12-19',
          schedule_history: [
            { status: 'pending', scheduled_date: '2024-12-19' }
          ]
        },
        {
          id: 'schedule-2',
          next_due_date: '2024-12-18',
          schedule_history: [
            { status: 'completed', scheduled_date: '2024-12-18' }
          ]
        },
        {
          id: 'schedule-3',
          next_due_date: '2024-12-17',
          schedule_history: [] // No history
        },
        {
          id: 'schedule-4',
          next_due_date: '2024-12-16',
          schedule_history: [
            { status: 'skipped', scheduled_date: '2024-12-16' }
          ]
        }
      ];

      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 10))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
          })
        })
      };

      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockOverdueData))
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([])),
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery)
        .mockReturnValueOnce(mockOverdueQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const response = await GET();
      const responseData = await response.json();

      // Should count: schedule-1 (pending), schedule-3 (no history), schedule-4 (skipped)
      // Should not count: schedule-2 (completed)
      expect(responseData.overdueItems).toBe(3);
    });

    it('should handle null and undefined values in completion rate calculation', async () => {
      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 10))
        })
      };

      const mockTodayQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
          })
        })
      };

      const mockOverdueQuery = {
        select: jest.fn().mockReturnValue({
          lt: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      // Mock history queries returning null/undefined data
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null)),
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse(undefined))
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockTodayQuery)
        .mockReturnValueOnce(mockOverdueQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.completionRates).toEqual({
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      });
    });
  });
});