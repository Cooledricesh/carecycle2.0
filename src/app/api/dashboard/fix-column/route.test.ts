/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import { GET, POST } from './route';
import {
  createMockSupabaseResponse,
  createMockRpcResponse,
  createMockDatabaseError,
  mockConsole,
  mockEnvironmentVariables,
} from '@/lib/test-utils';

// Mock dependencies
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
};

const mockCreatePureClient = jest.fn().mockResolvedValue(mockSupabaseClient);
const mockSanitizeErrorMessage = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createPureClient: () => mockCreatePureClient(),
}));

jest.mock('@/lib/api-errors', () => ({
  sanitizeErrorMessage: (error: any) => mockSanitizeErrorMessage(error),
}));

describe('/api/dashboard/fix-column', () => {
  const consoleSpies = mockConsole();
  
  mockEnvironmentVariables({
    NODE_ENV: 'test',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSanitizeErrorMessage.mockImplementation((error) => {
      if (error instanceof Error) return error.message;
      return String(error);
    });
  });

  describe('GET method', () => {
    describe('Column existence check', () => {
      it('should return column exists when RPC check succeeds', async () => {
        // Mock successful RPC call that finds the column
        mockSupabaseClient.rpc.mockResolvedValue(
          createMockRpcResponse({ column_name: 'actual_completion_date' }, null)
        );

        const response = await GET();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toEqual({
          columnExists: true,
          tableName: 'schedule_history',
          columnName: 'actual_completion_date',
          message: 'Column actual_completion_date exists in schedule_history table'
        });

        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
          'exec_sql',
          {
            sql: expect.stringContaining("SELECT column_name")
          }
        );
      });

      it('should return column does not exist when RPC returns null', async () => {
        // Mock RPC call that doesn't find the column
        mockSupabaseClient.rpc.mockResolvedValue(
          createMockRpcResponse(null, null)
        );

        const response = await GET();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toEqual({
          columnExists: false,
          tableName: 'schedule_history',
          columnName: 'actual_completion_date',
          message: 'Column actual_completion_date does not exist in schedule_history table'
        });
      });

      it('should fallback to direct select when RPC fails', async () => {
        // Mock RPC failure, then successful select
        mockSupabaseClient.rpc.mockImplementationOnce(() => 
          Promise.reject(new Error('RPC not available'))
        );
        
        const mockSelectQuery = {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([]))
          })
        };
        
        mockSupabaseClient.from.mockReturnValue(mockSelectQuery);

        const response = await GET();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.columnExists).toBe(true);
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('schedule_history');
        expect(mockSelectQuery.select).toHaveBeenCalledWith('actual_completion_date');
      });

      it('should detect column does not exist via select error', async () => {
        // Mock RPC failure, then select with column not exist error
        mockSupabaseClient.rpc.mockImplementationOnce(() => 
          Promise.reject(new Error('RPC not available'))
        );
        
        const mockSelectQuery = {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(
              createMockSupabaseResponse(null, createMockDatabaseError('Column does not exist', '42703'))
            )
          })
        };
        
        mockSupabaseClient.from.mockReturnValue(mockSelectQuery);

        const response = await GET();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.columnExists).toBe(false);
      });

      it('should handle fallback select error', async () => {
        // Mock both RPC and fallback select failure
        mockSupabaseClient.rpc.mockImplementationOnce(() => 
          Promise.reject(new Error('RPC not available'))
        );
        
        const mockSelectQuery = {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(
              createMockSupabaseResponse(null, createMockDatabaseError('Connection failed'))
            )
          })
        };
        
        mockSupabaseClient.from.mockReturnValue(mockSelectQuery);
        mockSanitizeErrorMessage.mockReturnValue('Sanitized error message');

        const response = await GET();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to check column existence',
          message: 'Sanitized error message'
        });

        expect(consoleSpies.error).toHaveBeenCalledWith(
          'Error checking column existence:',
          expect.any(Error)
        );
      });
    });

    describe('Error handling', () => {
      it('should handle Supabase client creation error', async () => {
        mockCreatePureClient.mockRejectedValueOnce(new Error('Supabase unavailable'));
        mockSanitizeErrorMessage.mockReturnValue('Service unavailable');

        const response = await GET();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to check column',
          message: 'Service unavailable'
        });

        expect(consoleSpies.error).toHaveBeenCalledWith(
          'Check column API error:',
          expect.any(Error)
        );
      });

      it('should handle unexpected errors', async () => {
        mockSupabaseClient.rpc.mockImplementation(() => {
          throw new Error('Unexpected error');
        });
        mockSanitizeErrorMessage.mockReturnValue('Unexpected error occurred');

        const response = await GET();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to check column',
          message: 'Unexpected error occurred'
        });
      });
    });
  });

  describe('POST method', () => {
    describe('Column creation', () => {
      it('should return success when column already exists', async () => {
        // Mock RPC call that finds existing column
        mockSupabaseClient.rpc.mockResolvedValue(
          createMockRpcResponse({ column_name: 'actual_completion_date' }, null)
        );

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toEqual({
          success: true,
          message: 'Column actual_completion_date already exists in schedule_history table',
          columnExists: true
        });
      });

      it('should create column when it does not exist', async () => {
        // Mock RPC calls: first check (not found), alter table (success), verify (found)
        mockSupabaseClient.rpc
          .mockResolvedValueOnce(createMockRpcResponse(null, null)) // Initial check - not found
          .mockResolvedValueOnce(createMockRpcResponse({}, null)) // ALTER TABLE - success
          .mockResolvedValueOnce(createMockRpcResponse({ column_name: 'actual_completion_date' }, null)); // Verification - found

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toEqual({
          success: true,
          message: 'Column actual_completion_date added successfully to schedule_history table',
          columnExists: true
        });

        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
          'exec_sql',
          {
            sql: 'ALTER TABLE schedule_history ADD COLUMN IF NOT EXISTS actual_completion_date DATE;'
          }
        );
      });

      it('should fallback to direct select for column checking', async () => {
        // Mock RPC failure for initial check, successful select, successful ALTER, successful verify
        mockSupabaseClient.rpc
          .mockRejectedValueOnce(new Error('RPC not available')) // Initial check fails
          .mockResolvedValueOnce(createMockRpcResponse({}, null)) // ALTER TABLE - success
          .mockRejectedValueOnce(new Error('RPC not available')); // Verification RPC fails

        const mockSelectQuery = {
          select: jest.fn().mockReturnValue({
            limit: jest.fn()
              .mockResolvedValueOnce( // Initial check - column not found
                createMockSupabaseResponse(null, createMockDatabaseError('Column does not exist', '42703'))
              )
              .mockResolvedValueOnce( // Verification check - column found
                createMockSupabaseResponse([])
              )
          })
        };
        
        mockSupabaseClient.from.mockReturnValue(mockSelectQuery);

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          success: true,
          columnExists: true
        });
      });

      it('should handle ALTER TABLE SQL execution error', async () => {
        // Mock: column not found, ALTER TABLE fails
        mockSupabaseClient.rpc
          .mockResolvedValueOnce(createMockRpcResponse(null, null)) // Column check - not found
          .mockResolvedValueOnce(createMockRpcResponse(null, createMockDatabaseError('Permission denied'))); // ALTER fails

        mockSanitizeErrorMessage.mockReturnValue('Database permission error');

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to add actual_completion_date column',
          message: 'Database permission error'
        });

        expect(consoleSpies.error).toHaveBeenCalledWith(
          'Error adding column via RPC:',
          expect.any(Error)
        );
      });

      it('should handle RPC not available error', async () => {
        // Mock: column not found, RPC fails for ALTER
        mockSupabaseClient.rpc
          .mockResolvedValueOnce(createMockRpcResponse(null, null)) // Column check - not found
          .mockRejectedValueOnce(new Error('RPC not available')); // ALTER RPC fails

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Unable to add column via API',
          message: 'Please use a database migration to add the actual_completion_date column',
          suggestion: 'Run: ALTER TABLE schedule_history ADD COLUMN IF NOT EXISTS actual_completion_date DATE;'
        });

        expect(consoleSpies.error).toHaveBeenCalledWith(
          'RPC not available, column may need to be added via migration:',
          expect.any(Error)
        );
      });

      it('should handle verification failure after ALTER', async () => {
        // Mock: column not found, ALTER success, verification fails
        mockSupabaseClient.rpc
          .mockResolvedValueOnce(createMockRpcResponse(null, null)) // Initial check - not found
          .mockResolvedValueOnce(createMockRpcResponse({}, null)) // ALTER TABLE - success
          .mockResolvedValueOnce(createMockRpcResponse(null, null)); // Verification - still not found

        const mockSelectQuery = {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(
              createMockSupabaseResponse(null, createMockDatabaseError('Column does not exist', '42703'))
            )
          })
        };
        
        mockSupabaseClient.from.mockReturnValue(mockSelectQuery);

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to verify column addition',
          message: 'Column may not have been added successfully'
        });
      });
    });

    describe('Error handling', () => {
      it('should handle initial column check error', async () => {
        // Mock both RPC and fallback select failure during initial check
        mockSupabaseClient.rpc.mockRejectedValueOnce(new Error('RPC not available'));
        
        const mockSelectQuery = {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(
              createMockSupabaseResponse(null, createMockDatabaseError('Network error'))
            )
          })
        };
        
        mockSupabaseClient.from.mockReturnValue(mockSelectQuery);
        mockSanitizeErrorMessage.mockReturnValue('Network connection failed');

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to check column existence',
          message: 'Network connection failed'
        });
      });

      it('should handle Supabase client creation error', async () => {
        mockCreatePureClient.mockRejectedValueOnce(new Error('Supabase initialization failed'));
        mockSanitizeErrorMessage.mockReturnValue('Service initialization failed');

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to fix column',
          message: 'Service initialization failed'
        });

        expect(consoleSpies.error).toHaveBeenCalledWith(
          'Fix column API error:',
          expect.any(Error)
        );
      });

      it('should handle unexpected errors during POST', async () => {
        mockSupabaseClient.rpc.mockImplementation(() => {
          throw new Error('Unexpected POST error');
        });
        mockSanitizeErrorMessage.mockReturnValue('Unexpected system error');

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({
          error: 'Failed to fix column',
          message: 'Unexpected system error'
        });
      });
    });

    describe('Complex scenarios', () => {
      it('should handle mixed RPC availability during operation', async () => {
        // Mock: RPC works for check, fails for ALTER, works for verify
        mockSupabaseClient.rpc
          .mockResolvedValueOnce(createMockRpcResponse(null, null)) // Check - not found (RPC works)
          .mockRejectedValueOnce(new Error('RPC temporarily unavailable')) // ALTER fails
          .mockResolvedValueOnce(createMockRpcResponse({ column_name: 'actual_completion_date' }, null)); // Verify works

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData.error).toBe('Unable to add column via API');
      });

      it('should handle partial verification success', async () => {
        // Mock: successful operation but verification RPC fails, fallback select succeeds
        mockSupabaseClient.rpc
          .mockResolvedValueOnce(createMockRpcResponse(null, null)) // Check - not found
          .mockResolvedValueOnce(createMockRpcResponse({}, null)) // ALTER - success
          .mockRejectedValueOnce(new Error('Verification RPC failed')); // Verify RPC fails

        const mockSelectQuery = {
          select: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(createMockSupabaseResponse([])) // Column exists
          })
        };
        
        mockSupabaseClient.from.mockReturnValue(mockSelectQuery);

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData).toMatchObject({
          success: true,
          columnExists: true
        });
      });

      it('should handle database schema permissions error', async () => {
        mockSupabaseClient.rpc
          .mockResolvedValueOnce(createMockRpcResponse(null, null)) // Check - not found
          .mockResolvedValueOnce(createMockRpcResponse(null, createMockDatabaseError('insufficient_privilege')));

        mockSanitizeErrorMessage.mockReturnValue('Permission denied');

        const response = await POST();
        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toMatchObject({
          error: 'Failed to add actual_completion_date column',
          message: 'Permission denied'
        });
      });
    });
  });

  describe('SQL injection protection', () => {
    it('should use parameterized queries for RPC calls', async () => {
      mockSupabaseClient.rpc.mockResolvedValue(
        createMockRpcResponse({ column_name: 'actual_completion_date' }, null)
      );

      await GET();

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('WHERE table_name = \'schedule_history\'')
      });
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('exec_sql', {
        sql: expect.stringContaining('AND column_name = \'actual_completion_date\'')
      });
    });

    it('should use safe SQL for ALTER TABLE operations', async () => {
      mockSupabaseClient.rpc
        .mockResolvedValueOnce(createMockRpcResponse(null, null))
        .mockResolvedValueOnce(createMockRpcResponse({}, null))
        .mockResolvedValueOnce(createMockRpcResponse({ column_name: 'actual_completion_date' }, null));

      await POST();

      const alterCall = mockSupabaseClient.rpc.mock.calls.find(call => 
        call[1]?.sql?.includes('ALTER TABLE')
      );
      
      expect(alterCall[1].sql).toBe(
        'ALTER TABLE schedule_history ADD COLUMN IF NOT EXISTS actual_completion_date DATE;'
      );
    });
  });

  describe('Response consistency', () => {
    it('should return consistent response format for GET success', async () => {
      mockSupabaseClient.rpc.mockResolvedValue(
        createMockRpcResponse({ column_name: 'actual_completion_date' }, null)
      );

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty('columnExists');
      expect(responseData).toHaveProperty('tableName', 'schedule_history');
      expect(responseData).toHaveProperty('columnName', 'actual_completion_date');
      expect(responseData).toHaveProperty('message');
      expect(typeof responseData.columnExists).toBe('boolean');
    });

    it('should return consistent response format for POST success', async () => {
      mockSupabaseClient.rpc.mockResolvedValue(
        createMockRpcResponse({ column_name: 'actual_completion_date' }, null)
      );

      const response = await POST();
      const responseData = await response.json();

      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('message');
      expect(responseData).toHaveProperty('columnExists', true);
    });

    it('should return consistent error format', async () => {
      mockCreatePureClient.mockRejectedValueOnce(new Error('Test error'));
      mockSanitizeErrorMessage.mockReturnValue('Test error message');

      const getResponse = await GET();
      const postResponse = await POST();

      const getResponseData = await getResponse.json();
      const postResponseData = await postResponse.json();

      // Both should have error and message fields
      expect(getResponseData).toHaveProperty('error');
      expect(getResponseData).toHaveProperty('message');
      expect(postResponseData).toHaveProperty('error');
      expect(postResponseData).toHaveProperty('message');
    });
  });
});