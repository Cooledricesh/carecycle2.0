/**
 * Centralized API Client Error Handling Utilities
 * Provides consistent error handling across the application
 */

import { ApiClientError, ApiErrorResponse, HttpStatusCode, HTTP_STATUS } from '@/types/api/common';

/**
 * Create a typed API client error
 */
export function createApiClientError(
  message: string, 
  status?: number, 
  code?: string,
  response?: any
): ApiClientError {
  const error: ApiClientError = new Error(message);
  error.name = 'ApiClientError';
  if (status !== undefined) {
    error.status = status;
  }
  if (code !== undefined) {
    error.code = code;
  }
  error.response = response;
  return error;
}

/**
 * Parse error from API response
 */
export function parseApiError(response: Response, data?: any): ApiClientError {
  const status = response.status as HttpStatusCode;
  let message = `HTTP ${status}: ${response.statusText}`;
  let code = 'HTTP_ERROR';

  // Try to extract more specific error information
  if (data) {
    if (typeof data === 'object') {
      message = data.message || data.error || message;
      code = data.code || code;
    } else if (typeof data === 'string') {
      message = data;
    }
  }

  return createApiClientError(message, status, code, {
    data,
    status,
    statusText: response.statusText
  });
}

/**
 * Handle network and other non-HTTP errors
 */
export function handleNetworkError(error: unknown): ApiClientError {
  if (error instanceof Error) {
    // Check if it's already our custom error
    if (error.name === 'ApiClientError') {
      return error as ApiClientError;
    }

    // Handle different types of network errors
    if (error.name === 'AbortError') {
      return createApiClientError('Request was cancelled', undefined, 'REQUEST_CANCELLED');
    }

    if (error.name === 'TimeoutError') {
      return createApiClientError('Request timed out', undefined, 'REQUEST_TIMEOUT');
    }

    // Generic network error
    return createApiClientError(
      error.message || 'Network error occurred', 
      undefined, 
      'NETWORK_ERROR'
    );
  }

  // Unknown error type
  return createApiClientError('Unknown error occurred', undefined, 'UNKNOWN_ERROR');
}

/**
 * Check if error is a specific HTTP status
 */
export function isHttpError(error: ApiClientError, status: HttpStatusCode): boolean {
  return error.status === status;
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: ApiClientError): boolean {
  return Boolean(error.status && error.status >= 400 && error.status < 500);
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: ApiClientError): boolean {
  return Boolean(error.status && error.status >= 500);
}

/**
 * Check if error is a network error (no status)
 */
export function isNetworkError(error: ApiClientError): boolean {
  return !error.status;
}

/**
 * Get user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: ApiClientError): string {
  // Handle specific status codes
  switch (error.status) {
    case HTTP_STATUS.UNAUTHORIZED:
      return '로그인이 필요합니다.';
    case HTTP_STATUS.FORBIDDEN:
      return '접근 권한이 없습니다.';
    case HTTP_STATUS.NOT_FOUND:
      return '요청한 데이터를 찾을 수 없습니다.';
    case HTTP_STATUS.CONFLICT:
      return '데이터 충돌이 발생했습니다.';
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return '입력한 데이터에 오류가 있습니다.';
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return '서버에서 오류가 발생했습니다.';
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return '서비스를 일시적으로 사용할 수 없습니다.';
    default:
      break;
  }

  // Handle specific error codes
  switch (error.code) {
    case 'NETWORK_ERROR':
      return '네트워크 연결을 확인해주세요.';
    case 'REQUEST_TIMEOUT':
      return '요청 시간이 초과되었습니다.';
    case 'REQUEST_CANCELLED':
      return '요청이 취소되었습니다.';
    default:
      break;
  }

  // Return original message if no specific handling
  return error.message || '알 수 없는 오류가 발생했습니다.';
}

/**
 * Log error with structured information for monitoring
 */
export function logError(error: ApiClientError, context?: Record<string, any>): void {
  const errorInfo = {
    message: error.message,
    status: error.status,
    code: error.code,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  };

  // In production, this would send to monitoring service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Example: Sentry.captureException(error, { extra: errorInfo });
    console.error('[API Error]', errorInfo);
  } else {
    console.error('[API Error]', errorInfo);
  }
}

/**
 * Retry configuration for different error types
 */
export function shouldRetry(error: ApiClientError, attemptCount: number): boolean {
  const maxAttempts = 3;
  
  if (attemptCount >= maxAttempts) {
    return false;
  }

  // Don't retry client errors (4xx) except for 408 (timeout) and 429 (rate limit)
  if (isClientError(error)) {
    return [408, 429].includes(error.status || 0);
  }

  // Retry server errors and network errors
  return isServerError(error) || isNetworkError(error);
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(attemptCount: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  
  const delay = baseDelay * Math.pow(2, attemptCount - 1);
  return Math.min(delay, maxDelay);
}