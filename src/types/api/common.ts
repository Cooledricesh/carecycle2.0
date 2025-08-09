/**
 * Common API Types
 * Shared types for API responses and error handling
 */

// Base API Response interface
export interface BaseApiResponse {
  success: boolean;
  timestamp: string;
}

// API Error Response interface
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp?: string;
  path?: string;
}

// Generic API Response wrapper
export interface ApiResponse<T = unknown> extends BaseApiResponse {
  data?: T;
  error?: ApiErrorResponse;
}

// API Client Error interface
export interface ApiClientError extends Error {
  status?: number;
  code?: string;
  response?: {
    data?: ApiErrorResponse;
    status: number;
    statusText: string;
  };
}

// Pagination interface for list endpoints
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends BaseApiResponse {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Query parameters for filtering
export interface FilterParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

// HTTP status code constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];