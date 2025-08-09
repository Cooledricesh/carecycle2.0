/**
 * Dashboard Service Unit Tests
 * Tests for pure business logic functions with mocked dependencies
 */

import { DashboardService, createDashboardService } from '../dashboard.service';

// Simple mock Supabase client
const createMockSupabaseClient = () => ({
  from: jest.fn(),
});

describe('DashboardService', () => {
  let mockSupabase: any;
  let dashboardService: DashboardService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    dashboardService = new DashboardService({ supabase: mockSupabase });
    jest.clearAllMocks();
  });

  describe('Service instantiation', () => {
    it('should create service with factory function', () => {
      const service = createDashboardService(mockSupabase);
      expect(service).toBeInstanceOf(DashboardService);
    });

    it('should accept valid supabase dependency', () => {
      expect(() => new DashboardService({ supabase: mockSupabase })).not.toThrow();
    });
  });

  describe('Public API methods', () => {
    it('should expose getStats method', () => {
      expect(typeof dashboardService.getStats).toBe('function');
    });

    it('should expose getRecentData method', () => {
      expect(typeof dashboardService.getRecentData).toBe('function');
    });

    it('should expose getTrends method', () => {
      expect(typeof dashboardService.getTrends).toBe('function');
    });
  });

  describe('Method signatures and behavior', () => {
    it('getStats should return Promise with correct structure', async () => {
      // Mock all the private methods to avoid complex database mocking
      jest.spyOn(dashboardService as any, 'getOverdueItemsCount').mockResolvedValue(5);
      jest.spyOn(dashboardService as any, 'calculateCompletionRates').mockResolvedValue({
        today: 85.5,
        thisWeek: 78.2,
        thisMonth: 82.1
      });

      // Mock the database calls for patient and schedule counts
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      
      // Mock patients count
      mockQueryBuilder.select.mockResolvedValueOnce({ count: 150, error: null });
      mockSupabase.from.mockReturnValueOnce(mockQueryBuilder);
      
      // Mock today scheduled count  
      mockQueryBuilder.select.mockResolvedValueOnce({ count: 25, error: null });
      mockSupabase.from.mockReturnValueOnce(mockQueryBuilder);

      const result = await dashboardService.getStats();

      expect(result).toEqual({
        totalPatients: 150,
        todayScheduled: 25,
        completionRates: {
          today: 85.5,
          thisWeek: 78.2,
          thisMonth: 82.1
        },
        overdueItems: 5
      });
    });

    it('getRecentData should return Promise with correct structure', async () => {
      // Mock the private methods
      jest.spyOn(dashboardService as any, 'getRecentActivity').mockResolvedValue([
        {
          id: '1',
          patientName: 'John Doe',
          patientNumber: 'P001',
          itemName: 'Blood Test',
          itemType: 'test',
          scheduledDate: '2025-01-08',
          completedDate: '2025-01-08',
          actualCompletionDate: null,
          status: 'completed',
          notes: null
        }
      ]);

      jest.spyOn(dashboardService as any, 'getUpcomingSchedules').mockResolvedValue([
        {
          id: '2',
          patientName: 'Jane Smith',
          patientNumber: 'P002',
          itemName: 'Vaccination',
          itemType: 'injection',
          dueDate: '2025-01-09',
          daysDue: 1
        }
      ]);

      const result = await dashboardService.getRecentData();

      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('upcomingSchedules');
      expect(Array.isArray(result.recentActivity)).toBe(true);
      expect(Array.isArray(result.upcomingSchedules)).toBe(true);
    });

    it('getTrends should return Promise with correct structure', async () => {
      // Mock the private methods
      jest.spyOn(dashboardService as any, 'getWeeklyCompletionRates').mockResolvedValue([
        {
          week: '2025-01-06',
          weekLabel: 'Jan 6-12',
          completionRate: 85.5,
          completedCount: 17,
          totalScheduled: 20
        }
      ]);

      jest.spyOn(dashboardService as any, 'getItemTypeDistribution').mockResolvedValue([
        { type: 'test', count: 60, percentage: 60.0 },
        { type: 'injection', count: 40, percentage: 40.0 }
      ]);

      const result = await dashboardService.getTrends();

      expect(result).toHaveProperty('weeklyCompletionRates');
      expect(result).toHaveProperty('itemTypeDistribution');
      expect(Array.isArray(result.weeklyCompletionRates)).toBe(true);
      expect(Array.isArray(result.itemTypeDistribution)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      const mockQueryBuilder = {
        select: jest.fn(),
      };
      mockQueryBuilder.select.mockResolvedValue({ 
        count: null, 
        error: { message: 'Database connection failed' } 
      });
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      await expect(dashboardService.getStats()).rejects.toThrow('Failed to fetch patients count: Database connection failed');
    });

    it('should handle null data gracefully', async () => {
      // Mock all methods to return safe defaults
      jest.spyOn(dashboardService as any, 'getOverdueItemsCount').mockResolvedValue(0);
      jest.spyOn(dashboardService as any, 'calculateCompletionRates').mockResolvedValue({
        today: 0,
        thisWeek: 0,
        thisMonth: 0
      });

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      
      // Mock null counts
      mockQueryBuilder.select.mockResolvedValue({ count: null, error: null });
      mockSupabase.from.mockReturnValue(mockQueryBuilder);

      const result = await dashboardService.getStats();
      
      expect(result.totalPatients).toBe(0);
      expect(result.todayScheduled).toBe(0);
    });
  });
});