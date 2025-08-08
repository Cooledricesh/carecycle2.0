import { NextResponse } from 'next/server';

/**
 * API Error Handler Utility
 * Sanitizes error messages for production environments to prevent information leakage
 */

interface ErrorResponse {
  error: string;
  message?: string;
  requestId?: string;
}

/**
 * Sanitizes error messages based on environment
 * In production: Returns generic messages
 * In development: Returns detailed error information
 */
export function sanitizeErrorMessage(error: unknown): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // In development, return full error details
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  
  // In production, return generic messages based on error type
  if (error instanceof Error) {
    // Check for common database errors and return safe messages
    const message = error.message.toLowerCase();
    
    if (message.includes('unique constraint') || message.includes('duplicate')) {
      return 'A record with this information already exists';
    }
    
    if (message.includes('foreign key') || message.includes('reference')) {
      return 'Related data dependency error';
    }
    
    if (message.includes('not found') || message.includes('no rows')) {
      return 'Requested resource not found';
    }
    
    if (message.includes('permission') || message.includes('denied') || message.includes('unauthorized')) {
      return 'Permission denied';
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request timeout';
    }
    
    if (message.includes('connection') || message.includes('connect')) {
      return 'Service temporarily unavailable';
    }
  }
  
  // Default generic message
  return 'An unexpected error occurred';
}

/**
 * Creates a standardized error response
 * Includes request ID for tracking in production
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  customMessage?: string
): NextResponse {
  const requestId = generateRequestId();
  
  // Log the full error server-side for debugging
  console.error(`[API Error ${requestId}]:`, error);
  
  const response: ErrorResponse = {
    error: customMessage || 'Request failed',
    message: sanitizeErrorMessage(error),
  };
  
  // Only include request ID in production for support purposes
  if (process.env.NODE_ENV === 'production') {
    response.requestId = requestId;
  }
  
  return NextResponse.json(response, { status: statusCode });
}

/**
 * Generates a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guard to check if error is a known database error
 */
export function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const dbErrorPatterns = [
    'constraint',
    'foreign key',
    'unique',
    'relation',
    'column',
    'table',
    'syntax',
    'query'
  ];
  
  const message = error.message.toLowerCase();
  return dbErrorPatterns.some(pattern => message.includes(pattern));
}

/**
 * Maps common HTTP error scenarios to status codes
 */
export function getStatusCodeFromError(error: unknown): number {
  if (!(error instanceof Error)) return 500;
  
  const message = error.message.toLowerCase();
  
  if (message.includes('not found')) return 404;
  if (message.includes('unauthorized') || message.includes('permission')) return 403;
  if (message.includes('invalid') || message.includes('validation')) return 400;
  if (message.includes('conflict') || message.includes('duplicate')) return 409;
  if (message.includes('timeout')) return 408;
  if (message.includes('too many')) return 429;
  
  return 500;
}