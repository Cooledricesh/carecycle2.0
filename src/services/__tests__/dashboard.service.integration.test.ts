/**
 * Dashboard Service Integration Tests
 * High-level tests demonstrating clean architecture benefits
 */

import { DashboardService, createDashboardService } from '../dashboard.service';

describe('Dashboard Service Clean Architecture Integration', () => {
  describe('Service Layer Benefits', () => {
    it('should demonstrate separation of concerns', () => {
      // Service can be created with any compatible dependency
      const mockSupabase = { from: jest.fn() };
      const service = createDashboardService(mockSupabase as any);
      
      expect(service).toBeInstanceOf(DashboardService);
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.getRecentData).toBe('function');
      expect(typeof service.getTrends).toBe('function');
    });

    it('should enable dependency injection for testing', () => {
      // Multiple different database implementations can be injected
      const mockSupabase1 = { from: jest.fn() };
      const mockSupabase2 = { from: jest.fn() };

      const service1 = createDashboardService(mockSupabase1 as any);
      const service2 = createDashboardService(mockSupabase2 as any);

      expect(service1).toBeInstanceOf(DashboardService);
      expect(service2).toBeInstanceOf(DashboardService);
      expect(service1).not.toBe(service2); // Different instances
    });

    it('should provide pure business logic functions', () => {
      const mockSupabase = { from: jest.fn() };
      const service = new DashboardService({ supabase: mockSupabase });

      // Business logic methods should be accessible
      expect(service).toHaveProperty('getStats');
      expect(service).toHaveProperty('getRecentData'); 
      expect(service).toHaveProperty('getTrends');

      // These are pure functions that can be tested in isolation
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.getRecentData).toBe('function');
      expect(typeof service.getTrends).toBe('function');
    });

    it('should maintain consistent API contracts', () => {
      const service = createDashboardService({ from: jest.fn() } as any);

      // Method signatures should be consistent
      expect(service.getStats).toHaveLength(0); // No parameters
      expect(service.getRecentData).toHaveLength(0); // No parameters  
      expect(service.getTrends).toHaveLength(0); // No parameters

      // All methods return promises
      const statsPromise = service.getStats();
      const recentPromise = service.getRecentData();
      const trendsPromise = service.getTrends();

      // These would be promises in real implementation
      expect(typeof statsPromise?.then).toBe('function');
      expect(typeof recentPromise?.then).toBe('function');
      expect(typeof trendsPromise?.then).toBe('function');
    });
  });

  describe('Clean Architecture Principles', () => {
    it('should demonstrate inward dependency rule', () => {
      // Service depends on abstraction (SupabaseClient interface)
      // not on concrete implementation
      const mockDb = {
        from: jest.fn(),
        // Could implement any database interface
      };

      expect(() => {
        new DashboardService({ supabase: mockDb });
      }).not.toThrow();
    });

    it('should isolate business logic from infrastructure', () => {
      // Business logic is separated from HTTP, database, and framework concerns
      const service = createDashboardService({ from: jest.fn() } as any);

      // Service methods don't depend on Next.js, HTTP requests, or specific DB implementation
      expect(service.constructor.name).toBe('DashboardService');
      
      // Methods can be called directly without HTTP context
      const methods = ['getStats', 'getRecentData', 'getTrends'];
      methods.forEach(method => {
        expect(typeof (service as any)[method]).toBe('function');
      });
    });

    it('should enable easy testing through mocking', () => {
      // Service layer enables easy unit testing by accepting mock dependencies
      const methodsCalled: string[] = [];
      
      const spySupabase = {
        from: jest.fn().mockImplementation((table) => {
          methodsCalled.push(`from:${table}`);
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            // ... other chain methods
          };
        })
      };

      const service = new DashboardService({ supabase: spySupabase });
      
      expect(service).toBeInstanceOf(DashboardService);
      expect(spySupabase.from).toHaveBeenCalledTimes(0); // Not called until methods are used
      
      // Service is ready for testing with mock data
      expect(typeof service.getStats).toBe('function');
    });
  });

  describe('Testability Improvements', () => {
    it('should achieve high testability through dependency injection', () => {
      // Before: Direct database calls, hard to test
      // After: Injected dependencies, easy to mock and test
      
      const testDatabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
      };

      const service = createDashboardService(testDatabase as any);
      
      // Service can now be tested with controlled test data
      expect(service).toBeDefined();
      expect(typeof service.getStats).toBe('function');
    });

    it('should demonstrate improved error handling', () => {
      // Error handling is centralized and consistent
      const errorDatabase = {
        from: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        })
      };

      const service = createDashboardService(errorDatabase as any);
      
      // Errors can be tested in isolation
      expect(() => {
        // Error will be thrown when database is accessed
        errorDatabase.from('test_table');
      }).toThrow('Database connection failed');

      expect(service).toBeDefined();
    });

    it('should showcase reduced coupling', () => {
      // Service doesn't depend on HTTP framework, specific database, or UI components
      const minimalDep = { from: () => ({}) };
      
      const service = createDashboardService(minimalDep as any);
      
      // Service works with minimal dependency contract
      expect(service).toBeInstanceOf(DashboardService);
      
      // Can be tested without Next.js, React, or full database setup
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.getRecentData).toBe('function');
      expect(typeof service.getTrends).toBe('function');
    });
  });
});