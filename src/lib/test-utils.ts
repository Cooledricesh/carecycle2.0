/**
 * Test Utilities for Dashboard API Routes
 * Provides shared mocking functions for Supabase and NextAuth
 */

import { type Session } from 'next-auth';

// Mock session data for testing
export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

// Mock Supabase client responses
export const createMockSupabaseResponse = <T>(
  data: T | null = null,
  error: any = null,
  count?: number
) => ({
  data,
  error,
  count: count ?? (data && Array.isArray(data) ? data.length : data ? 1 : 0),
  status: error ? 400 : 200,
  statusText: error ? 'Error' : 'OK',
});

// Mock Supabase RPC response
export const createMockRpcResponse = <T>(
  data: T | null = null,
  error: any = null
) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Error' : 'OK',
});

// Mock database data
export const mockPatients = [
  {
    id: 'patient-1',
    name: 'John Doe',
    patient_number: 'P001',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'patient-2',
    name: 'Jane Smith',
    patient_number: 'P002',
    created_at: '2024-01-02T00:00:00Z',
  },
];

export const mockItems = [
  {
    id: 'item-1',
    name: 'Blood Test',
    type: 'test' as const,
    description: 'Complete blood count',
  },
  {
    id: 'item-2',
    name: 'Vaccination',
    type: 'injection' as const,
    description: 'Annual vaccination',
  },
];

export const mockPatientSchedules = [
  {
    id: 'schedule-1',
    patient_id: 'patient-1',
    item_id: 'item-1',
    next_due_date: '2024-12-20',
    is_active: true,
    patients: mockPatients[0],
    items: mockItems[0],
  },
  {
    id: 'schedule-2',
    patient_id: 'patient-2',
    item_id: 'item-2',
    next_due_date: '2024-12-21',
    is_active: true,
    patients: mockPatients[1],
    items: mockItems[1],
  },
];

export const mockScheduleHistory = [
  {
    id: 'history-1',
    patient_schedule_id: 'schedule-1',
    scheduled_date: '2024-12-19',
    completed_date: '2024-12-19T10:00:00Z',
    actual_completion_date: '2024-12-19',
    status: 'completed' as const,
    notes: 'Test completed successfully',
    patient_schedules: mockPatientSchedules[0],
  },
  {
    id: 'history-2',
    patient_schedule_id: 'schedule-2',
    scheduled_date: '2024-12-20',
    completed_date: null,
    actual_completion_date: null,
    status: 'pending' as const,
    notes: null,
    patient_schedules: mockPatientSchedules[1],
  },
];

// Date utilities for testing
export const getTestDates = () => {
  const today = new Date('2024-12-20T12:00:00Z');
  const weekStart = new Date('2024-12-16T00:00:00Z');
  const monthStart = new Date('2024-12-01T00:00:00Z');
  
  return {
    today: today.toISOString().split('T')[0],
    weekStart: weekStart.toISOString().split('T')[0],
    monthStart: monthStart.toISOString().split('T')[0],
    nextWeek: new Date('2024-12-27T00:00:00Z').toISOString().split('T')[0],
  };
};

// Mock error types
export const createMockDatabaseError = (message: string, code?: string) => ({
  message,
  code,
  details: null,
  hint: null,
});

// Mock Supabase query builder chain
export const createMockQueryBuilder = () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    then: jest.fn(),
  };

  // Make the chain thenable for async operations
  mockChain.then = jest.fn((resolve) => {
    const result = createMockSupabaseResponse([]);
    return Promise.resolve(resolve ? resolve(result) : result);
  });

  return mockChain;
};

// Mock console methods for testing
export const mockConsole = () => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };

  const mockedMethods = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    console.log = mockedMethods.log;
    console.error = mockedMethods.error;
    console.warn = mockedMethods.warn;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  return mockedMethods;
};

// Environment variable mocking
export const mockEnvironmentVariables = (env: Record<string, string>) => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = { ...originalEnv, ...env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });
};