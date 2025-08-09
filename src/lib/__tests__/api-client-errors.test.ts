/**
 * API Client Error Handling Tests
 * Tests for centralized error handling utilities
 */

import {
  createApiClientError,
  parseApiError,
  handleNetworkError,
  isHttpError,
  isClientError,
  isServerError,
  isNetworkError,
  getUserFriendlyErrorMessage,
  shouldRetry,
  getRetryDelay,
} from '../api-client-errors';

import { HTTP_STATUS } from '@/types/api/common';

describe('API Client Error Utilities', () => {
  describe('createApiClientError', () => {
    it('should create an API client error with all properties', () => {
      const error = createApiClientError('Test error', 400, 'TEST_ERROR', { data: 'test' });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ApiClientError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.response).toEqual({ data: 'test' });
    });

    it('should create an error with minimal properties', () => {
      const error = createApiClientError('Simple error');

      expect(error.message).toBe('Simple error');
      expect(error.status).toBeUndefined();
      expect(error.code).toBeUndefined();
    });
  });

  describe('parseApiError', () => {
    const mockResponse = {
      status: 400,
      statusText: 'Bad Request',
    } as Response;

    it('should parse error from object response data', () => {
      const responseData = {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR'
      };

      const error = parseApiError(mockResponse, responseData);

      expect(error.message).toBe('Validation failed');
      expect(error.status).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should parse error from string response data', () => {
      const error = parseApiError(mockResponse, 'String error message');

      expect(error.message).toBe('String error message');
      expect(error.status).toBe(400);
    });

    it('should use default message when no response data', () => {
      const error = parseApiError(mockResponse);

      expect(error.message).toBe('HTTP 400: Bad Request');
      expect(error.code).toBe('HTTP_ERROR');
    });

    it('should handle response data without message or error fields', () => {
      const responseData = { someOtherField: 'value' };
      const error = parseApiError(mockResponse, responseData);

      expect(error.message).toBe('HTTP 400: Bad Request');
    });
  });

  describe('handleNetworkError', () => {
    it('should handle existing ApiClientError', () => {
      const existingError = createApiClientError('Existing error');
      const result = handleNetworkError(existingError);

      expect(result).toBe(existingError);
    });

    it('should handle AbortError', () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const result = handleNetworkError(abortError);

      expect(result.message).toBe('Request was cancelled');
      expect(result.code).toBe('REQUEST_CANCELLED');
    });

    it('should handle TimeoutError', () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';

      const result = handleNetworkError(timeoutError);

      expect(result.message).toBe('Request timed out');
      expect(result.code).toBe('REQUEST_TIMEOUT');
    });

    it('should handle generic Error', () => {
      const genericError = new Error('Network failure');

      const result = handleNetworkError(genericError);

      expect(result.message).toBe('Network failure');
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should handle unknown error types', () => {
      const result = handleNetworkError('unknown error');

      expect(result.message).toBe('Unknown error occurred');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Error type checking functions', () => {
    describe('isHttpError', () => {
      it('should return true for matching status', () => {
        const error = createApiClientError('Test', 404);
        expect(isHttpError(error, HTTP_STATUS.NOT_FOUND)).toBe(true);
      });

      it('should return false for non-matching status', () => {
        const error = createApiClientError('Test', 404);
        expect(isHttpError(error, HTTP_STATUS.INTERNAL_SERVER_ERROR)).toBe(false);
      });
    });

    describe('isClientError', () => {
      it('should return true for 4xx status codes', () => {
        expect(isClientError(createApiClientError('Test', 400))).toBe(true);
        expect(isClientError(createApiClientError('Test', 404))).toBe(true);
        expect(isClientError(createApiClientError('Test', 499))).toBe(true);
      });

      it('should return false for non-4xx status codes', () => {
        expect(isClientError(createApiClientError('Test', 200))).toBe(false);
        expect(isClientError(createApiClientError('Test', 500))).toBe(false);
        expect(isClientError(createApiClientError('Test'))).toBe(false);
      });
    });

    describe('isServerError', () => {
      it('should return true for 5xx status codes', () => {
        expect(isServerError(createApiClientError('Test', 500))).toBe(true);
        expect(isServerError(createApiClientError('Test', 503))).toBe(true);
        expect(isServerError(createApiClientError('Test', 599))).toBe(true);
      });

      it('should return false for non-5xx status codes', () => {
        expect(isServerError(createApiClientError('Test', 400))).toBe(false);
        expect(isServerError(createApiClientError('Test', 200))).toBe(false);
        expect(isServerError(createApiClientError('Test'))).toBe(false);
      });
    });

    describe('isNetworkError', () => {
      it('should return true for errors without status', () => {
        expect(isNetworkError(createApiClientError('Test'))).toBe(true);
      });

      it('should return false for errors with status', () => {
        expect(isNetworkError(createApiClientError('Test', 500))).toBe(false);
      });
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return Korean messages for specific HTTP status codes', () => {
      expect(getUserFriendlyErrorMessage(createApiClientError('Test', 401))).toBe('로그인이 필요합니다.');
      expect(getUserFriendlyErrorMessage(createApiClientError('Test', 403))).toBe('접근 권한이 없습니다.');
      expect(getUserFriendlyErrorMessage(createApiClientError('Test', 404))).toBe('요청한 데이터를 찾을 수 없습니다.');
      expect(getUserFriendlyErrorMessage(createApiClientError('Test', 500))).toBe('서버에서 오류가 발생했습니다.');
    });

    it('should return Korean messages for specific error codes', () => {
      expect(getUserFriendlyErrorMessage(createApiClientError('Test', undefined, 'NETWORK_ERROR'))).toBe('네트워크 연결을 확인해주세요.');
      expect(getUserFriendlyErrorMessage(createApiClientError('Test', undefined, 'REQUEST_TIMEOUT'))).toBe('요청 시간이 초과되었습니다.');
      expect(getUserFriendlyErrorMessage(createApiClientError('Test', undefined, 'REQUEST_CANCELLED'))).toBe('요청이 취소되었습니다.');
    });

    it('should return original message for unhandled cases', () => {
      expect(getUserFriendlyErrorMessage(createApiClientError('Custom error', 418))).toBe('Custom error');
    });

    it('should return default message for empty error message', () => {
      expect(getUserFriendlyErrorMessage(createApiClientError('', 999))).toBe('알 수 없는 오류가 발생했습니다.');
    });
  });

  describe('shouldRetry', () => {
    it('should not retry after max attempts', () => {
      const error = createApiClientError('Test', 500);
      expect(shouldRetry(error, 3)).toBe(false);
    });

    it('should not retry client errors except 408 and 429', () => {
      expect(shouldRetry(createApiClientError('Test', 400), 1)).toBe(false);
      expect(shouldRetry(createApiClientError('Test', 404), 1)).toBe(false);
      expect(shouldRetry(createApiClientError('Test', 408), 1)).toBe(true);
      expect(shouldRetry(createApiClientError('Test', 429), 1)).toBe(true);
    });

    it('should retry server errors', () => {
      expect(shouldRetry(createApiClientError('Test', 500), 1)).toBe(true);
      expect(shouldRetry(createApiClientError('Test', 503), 2)).toBe(true);
    });

    it('should retry network errors', () => {
      expect(shouldRetry(createApiClientError('Test'), 1)).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff delays', () => {
      expect(getRetryDelay(1)).toBe(1000);  // 1 second
      expect(getRetryDelay(2)).toBe(2000);  // 2 seconds
      expect(getRetryDelay(3)).toBe(4000);  // 4 seconds
      expect(getRetryDelay(4)).toBe(8000);  // 8 seconds
    });

    it('should cap delay at maximum', () => {
      expect(getRetryDelay(10)).toBe(30000);  // Should be capped at 30 seconds
    });
  });
});