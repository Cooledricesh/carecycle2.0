/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import {
  createMockSupabaseResponse,
  createMockDatabaseError,
  createMockSession,
  mockScheduleHistory,
  mockPatientSchedules,
  mockConsole,
  mockEnvironmentVariables,
} from '@/lib/test-utils';

// Mock dependencies - create fresh instances in beforeEach
let mockSupabaseClient: any;
let mockCreatePureClient: jest.Mock;
let mockCreateErrorResponse: jest.Mock;
let mockGetServerSession: jest.Mock;

// Factory function to create fresh mock instances
const createMockSupabaseClient = () => ({
  from: jest.fn(),
});

// Initialize mocks - will be reset in beforeEach
mockSupabaseClient = createMockSupabaseClient();
mockCreatePureClient = jest.fn().mockResolvedValue(mockSupabaseClient);
mockCreateErrorResponse = jest.fn();
mockGetServerSession = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createPureClient: () => mockCreatePureClient(),
}));

jest.mock('@/lib/api-errors', () => ({
  createErrorResponse: (...args: any[]) => mockCreateErrorResponse(...args),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: () => mockGetServerSession(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock Date for consistent testing
const FIXED_DATE = new Date('2024-12-20T12:00:00Z');
const OriginalDate = Date; // Save the original Date constructor

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

describe('/api/dashboard/recent', () => {
  const consoleSpies = mockConsole();
  
  mockEnvironmentVariables({
    NODE_ENV: 'test',
  });

  // Helper function to get fresh GET import with proper Date mock
  const getRoute = async () => {
    // Reset modules but preserve our Date mock
    jest.resetModules();
    
    // Re-apply Date mock before importing
    global.Date = MockDate as any;
    
    const module = await import('./route');
    return module.GET;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh mock instances
    mockSupabaseClient = createMockSupabaseClient();
    mockCreatePureClient = jest.fn().mockResolvedValue(mockSupabaseClient);
    mockCreateErrorResponse = jest.fn().mockReturnValue(
      NextResponse.json({ error: 'Test error' }, { status: 500 })
    );
    mockGetServerSession = jest.fn().mockResolvedValue(createMockSession());
  });

  afterAll(() => {
    global.Date = OriginalDate;
  });

  describe('Authentication', () => {
    it('should return 401 when no session exists', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const GET = await getRoute();
      const response = await GET();

      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 when session exists but no user ID', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession({
        user: { id: '', email: 'test@example.com', name: 'Test User', image: null }
      }));

      const GET = await getRoute();
      const response = await GET();

      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(responseData).toEqual({ error: 'Unauthorized' });
    });

    it('should proceed when valid session with user ID exists', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession());
      
      // Mock successful queries
      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      
      expect(response.status).toBe(200);
    });
  });

  describe('Successful GET request', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should return recent activity and upcoming schedules', async () => {
      // Mock recent activity data
      const mockRecentActivityData = [
        {
          id: 'history-1',
          scheduled_date: '2024-12-19',
          completed_date: '2024-12-19T10:00:00Z',
          actual_completion_date: '2024-12-19',
          status: 'completed',
          notes: 'Test completed successfully',
          patient_schedules: {
            id: 'schedule-1',
            patients: {
              name: 'John Doe',
              patient_number: 'P001'
            },
            items: {
              name: 'Blood Test',
              type: 'test'
            }
          }
        },
        {
          id: 'history-2',
          scheduled_date: '2024-12-18',
          completed_date: '2024-12-18T14:30:00Z',
          actual_completion_date: null,
          status: 'completed',
          notes: null,
          patient_schedules: {
            id: 'schedule-2',
            patients: {
              name: 'Jane Smith',
              patient_number: 'P002'
            },
            items: {
              name: 'Vaccination',
              type: 'injection'
            }
          }
        }
      ];

      // Mock upcoming schedules data
      const mockUpcomingData = [
        {
          id: 'schedule-3',
          next_due_date: '2024-12-21',
          patients: {
            name: 'Bob Johnson',
            patient_number: 'P003'
          },
          items: {
            name: 'Blood Test',
            type: 'test'
          }
        },
        {
          id: 'schedule-4',
          next_due_date: '2024-12-22',
          patients: {
            name: 'Alice Wilson',
            patient_number: 'P004'
          },
          items: {
            name: 'Injection',
            type: 'injection'
          }
        }
      ];

      // Mock history lookup (no completed schedules for upcoming dates)
      const mockHistoryData: any[] = [];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockRecentActivityData))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockUpcomingData))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockHistoryData))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        recentActivity: [
          {
            id: 'history-1',
            patientName: 'John Doe',
            patientNumber: 'P001',
            itemName: 'Blood Test',
            itemType: 'test',
            scheduledDate: '2024-12-19',
            completedDate: '2024-12-19T10:00:00Z',
            actualCompletionDate: '2024-12-19',
            status: 'completed',
            notes: 'Test completed successfully',
          },
          {
            id: 'history-2',
            patientName: 'Jane Smith',
            patientNumber: 'P002',
            itemName: 'Vaccination',
            itemType: 'injection',
            scheduledDate: '2024-12-18',
            completedDate: '2024-12-18T14:30:00Z',
            actualCompletionDate: null,
            status: 'completed',
            notes: null,
          }
        ],
        upcomingSchedules: [
          {
            id: 'schedule-3',
            patientName: 'Bob Johnson',
            patientNumber: 'P003',
            itemName: 'Blood Test',
            itemType: 'test',
            dueDate: '2024-12-21',
            daysDue: 1, // 1 day from 2024-12-20
          },
          {
            id: 'schedule-4',
            patientName: 'Alice Wilson',
            patientNumber: 'P004',
            itemName: 'Injection',
            itemType: 'injection',
            dueDate: '2024-12-22',
            daysDue: 2, // 2 days from 2024-12-20
          }
        ]
      });
    });

    it('should handle empty results correctly', async () => {
      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        recentActivity: [],
        upcomingSchedules: []
      });
    });

    it('should filter out completed upcoming schedules', async () => {
      const mockUpcomingData = [
        {
          id: 'schedule-1',
          next_due_date: '2024-12-21',
          patients: { name: 'John Doe', patient_number: 'P001' },
          items: { name: 'Blood Test', type: 'test' }
        },
        {
          id: 'schedule-2',
          next_due_date: '2024-12-22',
          patients: { name: 'Jane Smith', patient_number: 'P002' },
          items: { name: 'Vaccination', type: 'injection' }
        }
      ];

      // Mock history showing schedule-1 is completed
      const mockHistoryData = [
        {
          patient_schedule_id: 'schedule-1',
          scheduled_date: '2024-12-21',
          status: 'completed'
        }
      ];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockUpcomingData))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockHistoryData))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      // Should only include schedule-2, as schedule-1 is completed
      expect(responseData.upcomingSchedules).toHaveLength(1);
      expect(responseData.upcomingSchedules[0].id).toBe('schedule-2');
    });

    it('should handle missing patient or item data gracefully', async () => {
      const mockRecentActivityData = [
        {
          id: 'history-1',
          scheduled_date: '2024-12-19',
          completed_date: '2024-12-19T10:00:00Z',
          actual_completion_date: null,
          status: 'completed',
          notes: null,
          patient_schedules: {
            id: 'schedule-1',
            patients: null, // Missing patient data
            items: {
              name: 'Blood Test',
              type: 'test'
            }
          }
        },
        {
          id: 'history-2',
          scheduled_date: '2024-12-18',
          completed_date: '2024-12-18T14:30:00Z',
          actual_completion_date: '2024-12-18',
          status: 'completed',
          notes: 'Completed successfully',
          patient_schedules: {
            id: 'schedule-2',
            patients: {
              name: 'Jane Smith',
              patient_number: 'P002'
            },
            items: null // Missing item data
          }
        }
      ];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockRecentActivityData))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.recentActivity).toHaveLength(2);
      
      // First item with missing patient data
      expect(responseData.recentActivity[0]).toMatchObject({
        id: 'history-1',
        patientName: '',
        patientNumber: '',
        itemName: 'Blood Test',
        itemType: 'test',
      });

      // Second item with missing item data
      expect(responseData.recentActivity[1]).toMatchObject({
        id: 'history-2',
        patientName: 'Jane Smith',
        patientNumber: 'P002',
        itemName: '',
        itemType: 'test', // Default value
      });
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should handle recent activity query error', async () => {
      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(
                  createMockSupabaseResponse(null, createMockDatabaseError('Query failed'))
                )
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockRecentQuery);

      const GET = await getRoute();
      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Failed to fetch recent activity: Query failed'),
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle upcoming schedules query error', async () => {
      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(
                  createMockSupabaseResponse(null, createMockDatabaseError('Connection timeout'))
                )
              })
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery);

      const GET = await getRoute();
      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Failed to fetch upcoming schedules: Connection timeout'),
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle schedule history query error', async () => {
      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse([
                  { id: 'schedule-1', next_due_date: '2024-12-21', patients: {}, items: {} }
                ]))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(
                createMockSupabaseResponse(null, createMockDatabaseError('History query failed'))
              )
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Failed to fetch schedule history: History query failed'),
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle Zod validation errors gracefully', async () => {
      // Mock invalid data that will fail Zod validation
      const invalidRecentActivityData = [
        {
          id: 'history-1',
          // Missing required fields
          scheduled_date: null,
          status: 'invalid-status',
        }
      ];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(invalidRecentActivityData))
              })
            })
          })
        })
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockRecentQuery);

      const GET = await getRoute();
      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        expect.any(Error), // Zod validation error
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle Supabase client creation error', async () => {
      mockCreatePureClient.mockRejectedValueOnce(new Error('Supabase unavailable'));

      const GET = await getRoute();
      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Supabase unavailable'),
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle session retrieval error', async () => {
      mockGetServerSession.mockRejectedValueOnce(new Error('Session error'));

      const GET = await getRoute();
      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Session error'),
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const GET = await getRoute();
      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        new Error('Unexpected error'),
        500,
        'Failed to fetch recent dashboard data'
      );
    });
  });

  describe('Date calculations', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should calculate days due correctly', async () => {
      const mockUpcomingData = [
        {
          id: 'schedule-1',
          next_due_date: '2024-12-20', // Today - 0 days
          patients: { name: 'John Doe', patient_number: 'P001' },
          items: { name: 'Blood Test', type: 'test' }
        },
        {
          id: 'schedule-2', 
          next_due_date: '2024-12-21', // Tomorrow - 1 day
          patients: { name: 'Jane Smith', patient_number: 'P002' },
          items: { name: 'Vaccination', type: 'injection' }
        },
        {
          id: 'schedule-3',
          next_due_date: '2024-12-25', // 5 days from now
          patients: { name: 'Bob Johnson', patient_number: 'P003' },
          items: { name: 'Check-up', type: 'test' }
        }
      ];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockUpcomingData))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.upcomingSchedules).toHaveLength(3);
      
      expect(responseData.upcomingSchedules[0].daysDue).toBe(0); // Today
      expect(responseData.upcomingSchedules[1].daysDue).toBe(1); // Tomorrow
      expect(responseData.upcomingSchedules[2].daysDue).toBe(5); // 5 days from now
    });

    it('should use correct date ranges for queries', async () => {
      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      await GET();

      // Verify upcoming schedules query uses correct date range
      expect(mockUpcomingQuery.select().gte().lte().eq().order).toHaveBeenCalled();
      
      // Check that gte was called with today's date (2024-12-20)
      const gteCall = mockUpcomingQuery.select().gte;
      expect(gteCall).toHaveBeenCalledWith('next_due_date', '2024-12-20');
      
      // Check that lte was called with next week's date (2024-12-27)
      const lteCall = mockUpcomingQuery.select().gte().lte;
      expect(lteCall).toHaveBeenCalledWith('next_due_date', '2024-12-27');
    });
  });

  describe('Data transformation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(createMockSession());
    });

    it('should transform recent activity data correctly', async () => {
      const mockRecentActivityData = [
        {
          id: 'history-1',
          scheduled_date: '2024-12-19',
          completed_date: '2024-12-19T10:00:00Z',
          actual_completion_date: '2024-12-19',
          status: 'completed',
          notes: 'Completed on time',
          patient_schedules: {
            id: 'schedule-1',
            patients: {
              name: 'John Doe',
              patient_number: 'P001'
            },
            items: {
              name: 'Blood Test',
              type: 'test'
            }
          }
        }
      ];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockRecentActivityData))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.recentActivity[0]).toEqual({
        id: 'history-1',
        patientName: 'John Doe',
        patientNumber: 'P001',
        itemName: 'Blood Test',
        itemType: 'test',
        scheduledDate: '2024-12-19',
        completedDate: '2024-12-19T10:00:00Z',
        actualCompletionDate: '2024-12-19',
        status: 'completed',
        notes: 'Completed on time',
      });
    });

    it('should sort upcoming schedules by due date', async () => {
      const mockUpcomingData = [
        {
          id: 'schedule-1',
          next_due_date: '2024-12-23',
          patients: { name: 'John Doe', patient_number: 'P001' },
          items: { name: 'Blood Test', type: 'test' }
        },
        {
          id: 'schedule-2',
          next_due_date: '2024-12-21',
          patients: { name: 'Jane Smith', patient_number: 'P002' },
          items: { name: 'Vaccination', type: 'injection' }
        },
        {
          id: 'schedule-3',
          next_due_date: '2024-12-22',
          patients: { name: 'Bob Johnson', patient_number: 'P003' },
          items: { name: 'Check-up', type: 'test' }
        }
      ];

      const mockRecentQuery = {
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
              })
            })
          })
        })
      };

      const mockUpcomingQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue(createMockSupabaseResponse(mockUpcomingData))
              })
            })
          })
        })
      };

      const mockHistoryQuery = {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
            })
          })
        })
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockRecentQuery)
        .mockReturnValueOnce(mockUpcomingQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const GET = await getRoute();
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      
      // Should be sorted by due date: 2024-12-21, 2024-12-22, 2024-12-23
      expect(responseData.upcomingSchedules).toHaveLength(3);
      expect(responseData.upcomingSchedules[0].dueDate).toBe('2024-12-21');
      expect(responseData.upcomingSchedules[1].dueDate).toBe('2024-12-22');
      expect(responseData.upcomingSchedules[2].dueDate).toBe('2024-12-23');
    });
  });
});