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
const FIXED_DATE = new Date('2024-12-20T12:00:00Z');

describe('/api/dashboard/test', () => {
  const consoleSpies = mockConsole();
  
  mockEnvironmentVariables({
    NODE_ENV: 'test',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
    
    // Create fresh mock instances
    mockSupabaseClient = createMockSupabaseClient();
    mockCreatePureClient = jest.fn().mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Successful GET request', () => {
    it('should return comprehensive test results when all systems work', async () => {
      // Mock database connectivity test
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      // Mock table existence tests
      const mockTableQueries = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([{ id: 'test' }]))
        })
      };

      // Mock total patients sample query - supabase returns { count } from select with count: 'exact'
      const mockPatientsQuery = {
        select: jest.fn().mockResolvedValue({ count: 10 })
      };

      // Mock recent activity sample query
      const mockRecentActivityData = [
        {
          id: 'history-1',
          scheduled_date: '2024-12-19',
          status: 'completed',
          patient_schedules: {
            patients: { name: 'John Doe' },
            items: { name: 'Blood Test', type: 'test' }
          }
        },
        {
          id: 'history-2',
          scheduled_date: '2024-12-18',
          status: 'pending',
          patient_schedules: {
            patients: { name: 'Jane Smith' },
            items: { name: 'Vaccination', type: 'injection' }
          }
        }
      ];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockRecentActivityData))
        })
      };

      // Set up the mock calls in sequence
      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery) // Database connection test
        .mockReturnValueOnce(mockTableQueries) // patients table
        .mockReturnValueOnce(mockTableQueries) // items table
        .mockReturnValueOnce(mockTableQueries) // patient_schedules table
        .mockReturnValueOnce(mockTableQueries) // schedule_history table
        .mockReturnValueOnce(mockPatientsQuery) // Sample total patients query
        .mockReturnValueOnce(mockRecentQuery); // Sample recent activity query

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        message: 'Dashboard API test completed',
        timestamp: expect.any(String),
        results: {
          databaseConnection: {
            success: true,
            error: null
          },
          table_patients: {
            exists: true,
            hasData: true,
            error: null
          },
          table_items: {
            exists: true,
            hasData: true,
            error: null
          },
          table_patient_schedules: {
            exists: true,
            hasData: true,
            error: null
          },
          table_schedule_history: {
            exists: true,
            hasData: true,
            error: null
          },
          sampleQueries: {
            totalPatientsQuery: {
              success: true,
              count: 10
            },
            recentActivityQuery: {
              success: true,
              count: 2,
              error: null
            }
          },
          dateCalculations: {
            today: '2024-12-20',
            weekStart: '2024-12-16', // Monday of the week
            timezoneOffset: expect.any(Number)
          }
        }
      });
    });

    it('should handle empty tables correctly', async () => {
      // Mock database connectivity test success
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 0))
        })
      };

      // Mock table existence tests with no data
      const mockEmptyTableQueries = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      // Mock empty sample queries - need to return count property from resolved promise
      const mockPatientsQuery = {
        select: jest.fn().mockResolvedValue({ count: 0 })
      };

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery)
        .mockReturnValueOnce(mockEmptyTableQueries)
        .mockReturnValueOnce(mockEmptyTableQueries)
        .mockReturnValueOnce(mockEmptyTableQueries)
        .mockReturnValueOnce(mockEmptyTableQueries)
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockRecentQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.results.table_patients).toEqual({
        exists: true,
        hasData: false,
        error: null
      });
      expect(responseData.results.sampleQueries.totalPatientsQuery).toEqual({
        success: true,
        count: 0
      });
      expect(responseData.results.sampleQueries.recentActivityQuery).toEqual({
        success: true,
        count: 0,
        error: null
      });
    });

    it('should calculate correct date values', async () => {
      // Mock minimal successful responses to focus on date calculations
      const mockPatientsQuery = {
        select: jest.fn().mockResolvedValue({ count: 0 })
      };
      
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 0)) }) })
        .mockReturnValue(mockQuery)
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      // Dec 20, 2024 is a Friday (day 5). getDay() returns 5.
      // weekStart calculation: weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      // 20 - 5 + 1 = 16, so Monday Dec 16
      expect(responseData.results.dateCalculations.today).toBe('2024-12-20');
      expect(responseData.results.dateCalculations.weekStart).toBe('2024-12-16');
      expect(responseData.results.dateCalculations.timezoneOffset).toEqual(expect.any(Number));
    });
  });

  describe('Database connection errors', () => {
    it('should handle database connection failure', async () => {
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(
            createMockSupabaseResponse(null, createMockDatabaseError('Connection failed'))
          )
        })
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockConnectQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        success: false,
        message: 'Database connection failed',
        results: {
          databaseConnection: {
            success: false,
            error: 'Connection failed'
          }
        }
      });
    });

    it('should continue testing even if some tables fail', async () => {
      // Mock successful connection
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      // Mock mixed table results
      const mockSuccessQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([{ id: 'test' }]))
        })
      };

      const mockFailQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(
            createMockSupabaseResponse(null, createMockDatabaseError('Table not found'))
          )
        })
      };

      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery)
        .mockReturnValueOnce(mockSuccessQuery) // patients success
        .mockReturnValueOnce(mockFailQuery) // items fail
        .mockReturnValueOnce(mockSuccessQuery) // patient_schedules success
        .mockReturnValueOnce(mockFailQuery) // schedule_history fail
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockRecentQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.results.table_patients).toEqual({
        exists: true,
        hasData: true,
        error: null
      });
      expect(responseData.results.table_items).toEqual({
        exists: false,
        hasData: null,
        error: 'Table not found'
      });
      expect(responseData.results.table_patient_schedules).toEqual({
        exists: true,
        hasData: true,
        error: null
      });
      expect(responseData.results.table_schedule_history).toEqual({
        exists: false,
        hasData: null,
        error: 'Table not found'
      });
    });
  });

  describe('Sample query errors', () => {
    it('should handle sample query errors gracefully', async () => {
      // Mock successful connection and tables
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      const mockTableQueries = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([{ id: 'test' }]))
        })
      };

      // Mock failing sample queries - need to throw error to trigger catch block
      const mockFailPatientsQuery = {
        select: jest.fn().mockRejectedValue(new Error('Sample query failed'))
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockFailPatientsQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.results.sampleQueries).toEqual({
        error: expect.any(String)
      });
    });

    it('should handle partial sample query failure', async () => {
      // Mock successful connection and tables
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      const mockTableQueries = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([{ id: 'test' }]))
        })
      };

      // Mock success for patients, fail for recent activity
      const mockPatientsQuery = {
        select: jest.fn().mockResolvedValue({ count: 15 })
      };

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(
            createMockSupabaseResponse(null, createMockDatabaseError('Recent activity failed'))
          )
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockTableQueries)
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockRecentQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.results.sampleQueries).toEqual({
        totalPatientsQuery: {
          success: true,
          count: 15
        },
        recentActivityQuery: {
          success: false,
          count: 0,
          error: 'Recent activity failed'
        }
      });
    });
  });

  describe('Exception handling', () => {
    it('should handle table query exceptions', async () => {
      // Mock successful connection
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      // Mock table query that throws exception
      const mockThrowingQuery = {
        select: jest.fn().mockImplementation(() => {
          throw new Error('Query exception');
        })
      };

      const mockSuccessQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([{ id: 'test' }]))
        })
      };

      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery)
        .mockReturnValueOnce(mockThrowingQuery) // patients table throws
        .mockReturnValueOnce(mockSuccessQuery) // items success
        .mockReturnValueOnce(mockSuccessQuery) // patient_schedules success
        .mockReturnValueOnce(mockSuccessQuery) // schedule_history success
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockRecentQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.results.table_patients).toEqual({
        exists: false,
        hasData: false,
        error: 'Query exception'
      });
    });

    it('should handle Supabase client creation error', async () => {
      mockCreatePureClient.mockRejectedValueOnce(new Error('Supabase unavailable'));

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        success: false,
        message: 'Dashboard API test failed',
        error: 'Supabase unavailable',
        timestamp: expect.any(String)
      });
      
      expect(consoleSpies.error).toHaveBeenCalledWith(
        'Dashboard API test error:',
        expect.any(Error)
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        success: false,
        message: 'Dashboard API test failed',
        error: 'Unexpected error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Response format validation', () => {
    it('should always include timestamp in response', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([])),
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 0))
        })
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(responseData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should have consistent response structure on success', async () => {
      // Mock for connectivity test
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 0))
        })
      };

      // Mock for table queries
      const mockTableQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery)  // patients connectivity test
        .mockReturnValueOnce(mockTableQuery)     // patients table test
        .mockReturnValueOnce(mockTableQuery)     // items table test
        .mockReturnValueOnce(mockTableQuery)     // patient_schedules table test
        .mockReturnValueOnce(mockTableQuery);    // schedule_history table test

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('message');
      expect(responseData).toHaveProperty('timestamp');
      expect(responseData).toHaveProperty('results');
      expect(responseData.results).toHaveProperty('databaseConnection');
      expect(responseData.results).toHaveProperty('dateCalculations');
    });

    it('should have consistent response structure on error', async () => {
      mockCreatePureClient.mockRejectedValueOnce(new Error('Test error'));

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('message');
      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('timestamp');
    });
  });

  describe('Table testing comprehensive coverage', () => {
    it('should test all expected tables', async () => {
      const expectedTables = ['patients', 'items', 'patient_schedules', 'schedule_history'];
      
      const mockConnectQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 5))
        })
      };

      const mockTableQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      const mockPatientsQuery = {
        select: jest.fn().mockReturnValue({
          count: jest.fn().mockResolvedValue(createMockSupabaseResponse(null, null, 0))
        })
      };

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockConnectQuery)
        .mockReturnValue(mockTableQuery)
        .mockReturnValueOnce(mockPatientsQuery)
        .mockReturnValueOnce(mockRecentQuery);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      
      // Check that all expected tables are tested
      expectedTables.forEach(table => {
        expect(responseData.results).toHaveProperty(`table_${table}`);
        expect(responseData.results[`table_${table}`]).toHaveProperty('exists');
        expect(responseData.results[`table_${table}`]).toHaveProperty('hasData');
        expect(responseData.results[`table_${table}`]).toHaveProperty('error');
      });
    });
  });
});