/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import { GET } from './route';
import type { DashboardRecentResponse } from '@/types/dashboard';

// Mock dependencies
const mockDashboardService = {
  getStats: jest.fn(),
  getRecentActivity: jest.fn(),
  getRecentData: jest.fn(),
  getTrends: jest.fn(),
};

const mockCreateDashboardService = jest.fn().mockReturnValue(mockDashboardService);
const mockCreatePureClient = jest.fn().mockResolvedValue({});
const mockCreateErrorResponse = jest.fn();
const mockGetServerSession = jest.fn();

jest.mock('@/services/dashboard.service', () => ({
  createDashboardService: (...args: any[]) => mockCreateDashboardService(...args),
}));

jest.mock('@/lib/supabase/server', () => ({
  createPureClient: () => mockCreatePureClient(),
}));

jest.mock('@/lib/api-errors', () => ({
  createErrorResponse: (...args: any[]) => mockCreateErrorResponse(...args),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: { mock: 'authOptions' },
}));

describe('/api/dashboard/recent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateErrorResponse.mockReturnValue(
      NextResponse.json({ error: 'Test error' }, { status: 500 })
    );
    // Reset implementations
    mockCreatePureClient.mockResolvedValue({});
    mockCreateDashboardService.mockReturnValue(mockDashboardService);
    // Default session mock
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-123' } });
  });

  describe('Authentication', () => {
    it('should return 401 when no session exists', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({ error: 'Unauthorized' });
      expect(mockDashboardService.getRecentData).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user ID', async () => {
      mockGetServerSession.mockResolvedValue({ user: {} });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({ error: 'Unauthorized' });
      expect(mockDashboardService.getRecentData).not.toHaveBeenCalled();
    });
  });

  describe('Successful GET request', () => {
    it('should return recent dashboard data with all activities', async () => {
      const mockRecentResponse: DashboardRecentResponse = {
        recentActivity: [
          {
            id: 'activity-1',
            patientName: 'John Doe',
            itemName: 'Blood Pressure Check',
            action: 'completed',
            timestamp: '2024-12-20T10:30:00Z',
            status: 'completed'
          },
          {
            id: 'activity-2',
            patientName: 'Jane Smith',
            itemName: 'Medication Review',
            action: 'scheduled',
            timestamp: '2024-12-20T09:15:00Z',
            status: 'pending'
          }
        ],
        upcomingSchedules: [
          {
            id: 'schedule-1',
            patientName: 'Bob Wilson',
            itemName: 'Follow-up Visit',
            dueDate: '2024-12-21',
            priority: 'high'
          }
        ]
      };

      mockDashboardService.getRecentData.mockResolvedValue(mockRecentResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockRecentResponse);
      expect(mockCreateDashboardService).toHaveBeenCalledTimes(1);
      expect(mockDashboardService.getRecentData).toHaveBeenCalledTimes(1);
    });

    it('should handle empty recent data correctly', async () => {
      const mockRecentResponse: DashboardRecentResponse = {
        recentActivity: [],
        upcomingSchedules: []
      };

      mockDashboardService.getRecentData.mockResolvedValue(mockRecentResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual(mockRecentResponse);
      expect(responseData.recentActivity).toHaveLength(0);
      expect(responseData.upcomingSchedules).toHaveLength(0);
    });

    it('should handle large dataset correctly', async () => {
      const mockRecentResponse: DashboardRecentResponse = {
        recentActivity: Array.from({ length: 50 }, (_, i) => ({
          id: `activity-${i}`,
          patientName: `Patient ${i}`,
          itemName: `Item ${i}`,
          action: 'completed',
          timestamp: `2024-12-20T${String(10 + i % 14).padStart(2, '0')}:00:00Z`,
          status: 'completed'
        })),
        upcomingSchedules: Array.from({ length: 25 }, (_, i) => ({
          id: `schedule-${i}`,
          patientName: `Patient ${i}`,
          itemName: `Item ${i}`,
          dueDate: `2024-12-${21 + i % 10}`,
          priority: i % 2 === 0 ? 'high' : 'normal'
        }))
      };

      mockDashboardService.getRecentData.mockResolvedValue(mockRecentResponse);

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.recentActivity).toHaveLength(50);
      expect(responseData.upcomingSchedules).toHaveLength(25);
    });
  });

  describe('Error handling', () => {
    it('should handle service layer errors', async () => {
      const testError = new Error('Service error');
      mockDashboardService.getRecentData.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle supabase client creation error', async () => {
      const testError = new Error('Supabase connection failed');
      mockCreatePureClient.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle session retrieval errors', async () => {
      const testError = new Error('Session retrieval failed');
      mockGetServerSession.mockRejectedValue(testError);

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch recent dashboard data'
      );
    });

    it('should handle service creation errors', async () => {
      const testError = new Error('Service creation failed');
      mockCreateDashboardService.mockImplementation(() => {
        throw testError;
      });

      await GET();

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        testError,
        500,
        'Failed to fetch recent dashboard data'
      );
    });
  });

  describe('Integration', () => {
    it('should create dashboard service with supabase client', async () => {
      const mockRecentResponse: DashboardRecentResponse = {
        recentActivity: [],
        upcomingSchedules: []
      };

      const mockSupabaseClient = { mock: 'client' };
      mockCreatePureClient.mockResolvedValue(mockSupabaseClient);
      mockDashboardService.getRecentData.mockResolvedValue(mockRecentResponse);

      await GET();

      expect(mockCreatePureClient).toHaveBeenCalledTimes(1);
      expect(mockCreateDashboardService).toHaveBeenCalledWith(mockSupabaseClient);
      expect(mockDashboardService.getRecentData).toHaveBeenCalledTimes(1);
    });

    it('should use auth options for session validation', async () => {
      const mockRecentResponse: DashboardRecentResponse = {
        recentActivity: [],
        upcomingSchedules: []
      };

      mockDashboardService.getRecentData.mockResolvedValue(mockRecentResponse);

      await GET();

      expect(mockGetServerSession).toHaveBeenCalledWith({ mock: 'authOptions' });
    });

    it('should return proper NextResponse format', async () => {
      const mockRecentResponse: DashboardRecentResponse = {
        recentActivity: [{
          id: 'test',
          patientName: 'Test',
          itemName: 'Test',
          action: 'test',
          timestamp: '2024-12-20T10:00:00Z',
          status: 'pending'
        }],
        upcomingSchedules: []
      };

      mockDashboardService.getRecentData.mockResolvedValue(mockRecentResponse);

      const response = await GET();

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});