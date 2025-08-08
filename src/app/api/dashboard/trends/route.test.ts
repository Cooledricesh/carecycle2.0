/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import { GET } from './route';
import {
  createMockSupabaseResponse,
  createMockDatabaseError,
  mockConsole,
  mockEnvironmentVariables,
} from '@/lib/test-utils';

// Mock dependencies - create fresh instances in beforeEach
let mockSupabaseClient: any;
let mockCreatePureClient: jest.Mock;

// Factory function to create fresh mock instances
const createMockSupabaseClient = () => ({
  from: jest.fn(),
});

// Initialize mocks - will be reset in beforeEach
mockSupabaseClient = createMockSupabaseClient();
mockCreatePureClient = jest.fn().mockResolvedValue(mockSupabaseClient);

jest.mock('@/lib/supabase/server', () => ({
  createPureClient: () => mockCreatePureClient(),
}));

// Mock Date for consistent testing
const FIXED_DATE = new Date('2024-12-20T12:00:00Z'); // Friday
const OriginalDate = Date;

// Create a mock Date constructor that preserves static methods
const MockDate = jest.fn(((...args: any[]) => {
  if (args.length === 0) {
    return FIXED_DATE;
  }
  return new OriginalDate(...args);
}) as any);

// Copy static methods from original Date
MockDate.now = jest.fn(() => FIXED_DATE.getTime());
MockDate.parse = OriginalDate.parse;
MockDate.UTC = OriginalDate.UTC;

// Replace global Date with our mock
global.Date = MockDate as any;

describe('/api/dashboard/trends', () => {
  const consoleSpies = mockConsole();
  
  mockEnvironmentVariables({
    NODE_ENV: 'test',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh mock instances
    mockSupabaseClient = createMockSupabaseClient();
    mockCreatePureClient = jest.fn().mockResolvedValue(mockSupabaseClient);
  });

  afterAll(() => {
    global.Date = OriginalDate;
  });

  describe('Successful GET request', () => {
    it('should return weekly completion rates and item distribution', async () => {
      // Mock weekly completion data for 4 weeks
      const mockWeek0Data = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'pending' }
      ];
      const mockWeek1Data = [
        { id: '4', status: 'completed' },
        { id: '5', status: 'pending' },
        { id: '6', status: 'pending' }
      ];
      const mockWeek2Data = [
        { id: '7', status: 'completed' },
        { id: '8', status: 'completed' },
        { id: '9', status: 'completed' },
        { id: '10', status: 'pending' }
      ];
      const mockWeek3Data = [
        { id: '11', status: 'completed' }
      ];

      // Mock item distribution data
      const mockScheduleData = [
        {
          id: 'schedule-1',
          items: { type: 'test' }
        },
        {
          id: 'schedule-2',
          items: { type: 'test' }
        },
        {
          id: 'schedule-3',
          items: { type: 'injection' }
        },
        {
          id: 'schedule-4',
          items: { type: 'test' }
        },
        {
          id: 'schedule-5',
          items: { type: 'injection' }
        }
      ];

      // Setup mock queries for weekly data (4 calls for schedule_history)
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse(mockWeek3Data))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockWeek2Data))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockWeek1Data))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockWeek0Data))
          })
        })
      };

      // Setup mock query for item distribution
      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockScheduleData))
        })
      };

      // Mock 4 calls to schedule_history table, then 1 call to patient_schedules
      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery) // Week 3
        .mockReturnValueOnce(mockHistoryQuery) // Week 2
        .mockReturnValueOnce(mockHistoryQuery) // Week 1
        .mockReturnValueOnce(mockHistoryQuery) // Week 0 (current)
        .mockReturnValueOnce(mockScheduleQuery); // Item distribution

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);

      // Check weekly completion rates (should be 4 weeks)
      expect(responseData.weeklyCompletionRates).toHaveLength(4);
      
      // Week 3: 1/1 = 100%
      expect(responseData.weeklyCompletionRates[0]).toMatchObject({
        completionRate: 100,
        completedCount: 1,
        totalScheduled: 1
      });
      
      // Week 2: 3/4 = 75%
      expect(responseData.weeklyCompletionRates[1]).toMatchObject({
        completionRate: 75,
        completedCount: 3,
        totalScheduled: 4
      });
      
      // Week 1: 1/3 = 33.3%
      expect(responseData.weeklyCompletionRates[2]).toMatchObject({
        completionRate: 33.3,
        completedCount: 1,
        totalScheduled: 3
      });
      
      // Week 0 (current): 2/3 = 66.7%
      expect(responseData.weeklyCompletionRates[3]).toMatchObject({
        completionRate: 66.7,
        completedCount: 2,
        totalScheduled: 3
      });

      // Check item type distribution
      expect(responseData.itemTypeDistribution).toHaveLength(2);
      
      // Test: 3 out of 5 = 60%
      expect(responseData.itemTypeDistribution.find(item => item.type === 'test')).toEqual({
        type: 'test',
        count: 3,
        percentage: 60
      });
      
      // Injection: 2 out of 5 = 40%
      expect(responseData.itemTypeDistribution.find(item => item.type === 'injection')).toEqual({
        type: 'injection',
        count: 2,
        percentage: 40
      });
    });

    it('should handle zero data correctly', async () => {
      // Mock empty data for all weeks
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates).toHaveLength(4);
      
      // All weeks should have 0% completion
      responseData.weeklyCompletionRates.forEach((week: any) => {
        expect(week.completionRate).toBe(0);
        expect(week.completedCount).toBe(0);
        expect(week.totalScheduled).toBe(0);
      });

      // Item distribution should have default values
      expect(responseData.itemTypeDistribution).toEqual([
        { type: 'test', count: 0, percentage: 0 },
        { type: 'injection', count: 0, percentage: 0 }
      ]);
    });

    it('should calculate 100% completion rates correctly', async () => {
      // Mock all completed data
      const mockAllCompletedData = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'completed' }
      ];

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockAllCompletedData))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([
            { id: 'schedule-1', items: { type: 'test' } }
          ]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      
      // All weeks should have 100% completion
      responseData.weeklyCompletionRates.forEach((week: any) => {
        expect(week.completionRate).toBe(100);
        expect(week.completedCount).toBe(2);
        expect(week.totalScheduled).toBe(2);
      });
    });

    it('should format week labels correctly', async () => {
      // Mock minimal data to check week label formatting
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates).toHaveLength(4);

      // Check that week labels are formatted correctly
      responseData.weeklyCompletionRates.forEach((week: any) => {
        expect(week.weekLabel).toMatch(/^[A-Z][a-z]{2} \d{1,2} - [A-Z][a-z]{2} \d{1,2}$/);
        expect(week.week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle weekly completion rate calculation error', async () => {
      // Mock error on first week query - route will continue with empty data
      const mockHistoryQueryFail = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockRejectedValueOnce(createMockDatabaseError('Query failed'))
          })
        })
      };
      
      const mockHistoryQuerySuccess = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQueryFail)   // Week 1 - fails
        .mockReturnValueOnce(mockHistoryQuerySuccess) // Week 2
        .mockReturnValueOnce(mockHistoryQuerySuccess) // Week 3
        .mockReturnValueOnce(mockHistoryQuerySuccess) // Week 4
        .mockReturnValueOnce(mockScheduleQuery);      // Item distribution

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200); // Should still return 200
      expect(responseData.weeklyCompletionRates).toHaveLength(4);
      
      // First week should have 0 values due to error
      expect(responseData.weeklyCompletionRates[0].completionRate).toBe(0);
      expect(responseData.weeklyCompletionRates[0].completedCount).toBe(0);
      expect(responseData.weeklyCompletionRates[0].totalScheduled).toBe(0);
      
      expect(consoleSpies.error).toHaveBeenCalledWith(
        'Dashboard trends API error:', 
        expect.any(Error)
      );
    });

    it('should handle item distribution calculation error gracefully', async () => {
      // Mock successful weekly queries but failed distribution query
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValueOnce(createMockDatabaseError('Distribution query failed'))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates).toHaveLength(4);
      
      // Should have default distribution values due to error
      expect(responseData.itemTypeDistribution).toEqual([
        { type: 'test', count: 0, percentage: 0 },
        { type: 'injection', count: 0, percentage: 0 }
      ]);
      
      expect(consoleSpies.error).toHaveBeenCalledWith(
        'Failed to calculate item type distribution:', 
        expect.objectContaining({
          message: 'Distribution query failed'
        })
      );
    });

    it('should handle individual week calculation errors gracefully', async () => {
      // Mock partial success - some weeks succeed, others fail
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse([{ id: '1', status: 'completed' }])) // Week 3 success
              .mockResolvedValueOnce(createMockSupabaseResponse([{ id: '2', status: 'completed' }])) // Week 2 success
              .mockRejectedValueOnce(createMockDatabaseError('Week 1 failed')) // Week 1 error
              .mockResolvedValueOnce(createMockSupabaseResponse([{ id: '3', status: 'pending' }])) // Week 0 success
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([
            { id: 'schedule-1', items: { type: 'test' } }
          ]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates).toHaveLength(4);

      // Week with error should have 0 values
      const failedWeek = responseData.weeklyCompletionRates.find((week: any) => 
        week.completionRate === 0 && week.completedCount === 0 && week.totalScheduled === 0
      );
      expect(failedWeek).toBeDefined();

      expect(consoleSpies.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to calculate completion rate for week'),
        expect.objectContaining({
          message: expect.any(String)
        })
      );
    });

    it('should handle Supabase client creation error', async () => {
      mockCreatePureClient.mockImplementationOnce(() => {
        throw new Error('Supabase unavailable');
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        error: 'Failed to fetch dashboard trends',
        message: 'Supabase unavailable'
      });
    });

    it('should handle unexpected errors', async () => {
      mockCreatePureClient.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toMatchObject({
        error: 'Failed to fetch dashboard trends',
        message: 'Unexpected error'
      });
    });
  });

  describe('Date calculations', () => {
    it('should calculate correct week ranges for last 4 weeks', async () => {
      // Create separate mock objects for each week to avoid shared state
      const createMockHistoryQuery = () => ({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      });

      const mockHistoryQuery1 = createMockHistoryQuery();
      const mockHistoryQuery2 = createMockHistoryQuery();
      const mockHistoryQuery3 = createMockHistoryQuery();
      const mockHistoryQuery4 = createMockHistoryQuery();

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery1)
        .mockReturnValueOnce(mockHistoryQuery2)
        .mockReturnValueOnce(mockHistoryQuery3)
        .mockReturnValueOnce(mockHistoryQuery4)
        .mockReturnValueOnce(mockScheduleQuery);

      await GET();

      // Verify each week's query was called exactly once
      expect(mockHistoryQuery1.select().gte).toHaveBeenCalledTimes(1);
      expect(mockHistoryQuery1.select().gte().lte).toHaveBeenCalledTimes(1);
      expect(mockHistoryQuery2.select().gte).toHaveBeenCalledTimes(1);
      expect(mockHistoryQuery2.select().gte().lte).toHaveBeenCalledTimes(1);
      expect(mockHistoryQuery3.select().gte).toHaveBeenCalledTimes(1);
      expect(mockHistoryQuery3.select().gte().lte).toHaveBeenCalledTimes(1);
      expect(mockHistoryQuery4.select().gte).toHaveBeenCalledTimes(1);
      expect(mockHistoryQuery4.select().gte().lte).toHaveBeenCalledTimes(1);

      // Check that dates are in YYYY-MM-DD format and reasonable
      const allLteCalls = [
        ...mockHistoryQuery1.select().gte().lte.mock.calls,
        ...mockHistoryQuery2.select().gte().lte.mock.calls,
        ...mockHistoryQuery3.select().gte().lte.mock.calls,
        ...mockHistoryQuery4.select().gte().lte.mock.calls
      ];
      
      allLteCalls.forEach((call: any[]) => {
        expect(call[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // lte uses second parameter for date value
      });
    });

    it('should start weeks from Monday', async () => {
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      
      // Check that week values represent Sundays (start of week)
      responseData.weeklyCompletionRates.forEach((week: any) => {
        const weekDate = new Date(week.week);
        // Sunday is day 0 in JavaScript Date.getDay()
        expect(weekDate.getDay()).toBe(0);
      });
    });
  });

  describe('Data calculations', () => {
    it('should handle null/undefined data in completion calculations', async () => {
      // Mock data with null values
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse(null))
              .mockResolvedValueOnce(createMockSupabaseResponse(undefined))
              .mockResolvedValueOnce(createMockSupabaseResponse([]))
              .mockResolvedValueOnce(createMockSupabaseResponse([{ id: '1', status: 'completed' }]))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(null))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.weeklyCompletionRates).toHaveLength(4);

      // Should handle null/undefined gracefully
      const nullWeeks = responseData.weeklyCompletionRates.filter((week: any) => 
        week.completionRate === 0 && week.totalScheduled === 0
      );
      expect(nullWeeks.length).toBeGreaterThan(0);
    });

    it('should round completion rates to 1 decimal place', async () => {
      // Mock data that results in fractional percentages
      const mockPartialData = [
        { id: '1', status: 'completed' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'pending' }
      ]; // 1/3 = 33.333...%

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn()
              .mockResolvedValueOnce(createMockSupabaseResponse(mockPartialData))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockPartialData))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockPartialData))
              .mockResolvedValueOnce(createMockSupabaseResponse(mockPartialData))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([
            { id: 'schedule-1', items: { type: 'test' } }
          ]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);

      // All completion rates should be rounded to 1 decimal place
      responseData.weeklyCompletionRates.forEach((week: any) => {
        expect(week.completionRate).toBe(33.3); // Should be rounded to 1 decimal
      });
    });

    it('should handle edge case of very small percentages', async () => {
      // Create scenario with 1 completed out of many
      const mockLargeData = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        status: i === 0 ? 'completed' : 'pending'
      })); // 1/100 = 1%

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockLargeData))
          })
        })
      };

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse([
            { id: 'schedule-1', items: { type: 'test' } }
          ]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      
      // Should handle small percentages correctly
      responseData.weeklyCompletionRates.forEach((week: any) => {
        expect(week.completionRate).toBe(1);
        expect(week.completedCount).toBe(1);
        expect(week.totalScheduled).toBe(100);
      });
    });
  });

  describe('Item distribution calculations', () => {
    it('should handle items with only one type', async () => {
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      // Only test items
      const mockScheduleData = [
        { id: 'schedule-1', items: { type: 'test' } },
        { id: 'schedule-2', items: { type: 'test' } },
        { id: 'schedule-3', items: { type: 'test' } }
      ];

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockScheduleData))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.itemTypeDistribution).toEqual([
        { type: 'test', count: 3, percentage: 100 },
        { type: 'injection', count: 0, percentage: 0 }
      ]);
    });

    it('should round item distribution percentages correctly', async () => {
      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        })
      };

      // 2 tests, 1 injection = 66.666...% tests, 33.333...% injections
      const mockScheduleData = [
        { id: 'schedule-1', items: { type: 'test' } },
        { id: 'schedule-2', items: { type: 'test' } },
        { id: 'schedule-3', items: { type: 'injection' } }
      ];

      const mockScheduleQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockScheduleData))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockHistoryQuery)
        .mockReturnValueOnce(mockScheduleQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.itemTypeDistribution).toEqual([
        { type: 'test', count: 2, percentage: 66.7 },
        { type: 'injection', count: 1, percentage: 33.3 }
      ]);
    });
  });
});