/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */

import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import React from 'react';
import { NextResponse } from 'next/server';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  UNKNOWN = 'unknown',
}

export interface AppError extends Error {
  code?: string;
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  context?: Record<string, unknown>;
  userMessage?: string;
  technicalDetails?: string;
  timestamp?: string;
  retry?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  
  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log an error
   */
  handleError(error: unknown, context?: Record<string, unknown>): AppError {
    const appError = this.normalizeError(error, context);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', appError);
    }

    // Send to Sentry
    this.logToSentry(appError);

    // Show user notification if appropriate
    if (appError.userMessage) {
      this.showUserNotification(appError);
    }

    return appError;
  }

  /**
   * Handle async errors with retry capability
   */
  async handleAsyncError<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      context?: Record<string, unknown>;
      fallback?: T;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, context, fallback } = options;
    let lastError: AppError | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = this.handleError(error, {
          ...context,
          attempt: attempt + 1,
          maxRetries,
        });

        if (!this.shouldRetry(lastError) || attempt === maxRetries - 1) {
          break;
        }

        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    if (fallback !== undefined) {
      return fallback;
    }

    throw lastError;
  }

  /**
   * Normalize various error types into AppError
   */
  private normalizeError(error: unknown, context?: Record<string, unknown>): AppError {
    let appError: AppError;

    if (error instanceof Error) {
      appError = error as AppError;
    } else if (typeof error === 'string') {
      appError = new Error(error) as AppError;
    } else if (error && typeof error === 'object') {
      appError = new Error(JSON.stringify(error)) as AppError;
    } else {
      appError = new Error('An unknown error occurred') as AppError;
    }

    // Add default values
    appError.timestamp = new Date().toISOString();
    appError.context = { ...appError.context, ...context };

    // Categorize error if not already categorized
    if (!appError.category) {
      appError.category = this.categorizeError(appError);
    }

    // Set severity if not already set
    if (!appError.severity) {
      appError.severity = this.determineSeverity(appError);
    }

    // Set user message if not already set
    if (!appError.userMessage) {
      appError.userMessage = this.getUserMessage(appError);
    }

    // Determine if error should be retried
    appError.retry = this.shouldRetry(appError);

    return appError;
  }

  /**
   * Categorize error based on its characteristics
   */
  private categorizeError(error: AppError): ErrorCategory {
    const message = error.message.toLowerCase();
    const code = error.code?.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || code === 'network_error') {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('database') || message.includes('supabase') || code?.startsWith('pg_')) {
      return ErrorCategory.DATABASE;
    }
    if (message.includes('validation') || message.includes('invalid') || code === 'validation_error') {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('unauthorized') || message.includes('401') || code === 'auth_error') {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('403') || code === 'authz_error') {
      return ErrorCategory.AUTHORIZATION;
    }
    if (code?.startsWith('biz_')) {
      return ErrorCategory.BUSINESS_LOGIC;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: AppError): ErrorSeverity {
    // Critical errors
    if (
      error.category === ErrorCategory.DATABASE ||
      error.message.includes('critical') ||
      error.code?.includes('500')
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity
    if (
      error.category === ErrorCategory.AUTHENTICATION ||
      error.category === ErrorCategory.AUTHORIZATION
    ) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (
      error.category === ErrorCategory.VALIDATION ||
      error.category === ErrorCategory.BUSINESS_LOGIC
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity
    return ErrorSeverity.LOW;
  }

  /**
   * Generate user-friendly error message
   */
  private getUserMessage(error: AppError): string {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      case ErrorCategory.DATABASE:
        return '데이터를 처리하는 중 문제가 발생했습니다.';
      case ErrorCategory.VALIDATION:
        return '입력한 정보를 확인해주세요.';
      case ErrorCategory.AUTHENTICATION:
        return '로그인이 필요합니다.';
      case ErrorCategory.AUTHORIZATION:
        return '이 작업을 수행할 권한이 없습니다.';
      case ErrorCategory.BUSINESS_LOGIC:
        return '요청을 처리할 수 없습니다.';
      default:
        return '예기치 않은 오류가 발생했습니다.';
    }
  }

  /**
   * Determine if error should be retried
   */
  private shouldRetry(error: AppError): boolean {
    if (error.retry !== undefined) {
      return error.retry;
    }

    return (
      error.category === ErrorCategory.NETWORK ||
      (error.category === ErrorCategory.DATABASE && !error.message.includes('constraint'))
    );
  }

  /**
   * Log error to Sentry
   */
  private logToSentry(error: AppError): void {
    const level = this.mapSeverityToSentryLevel(error.severity || ErrorSeverity.LOW);
    
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setContext('error_details', {
        category: error.category,
        code: error.code,
        userMessage: error.userMessage,
        technicalDetails: error.technicalDetails,
        timestamp: error.timestamp,
        ...error.context,
      });
      
      if (error.category) {
        scope.setTag('error_category', error.category);
      }
      if (error.code) {
        scope.setTag('error_code', error.code);
      }
      
      Sentry.captureException(error);
    });
  }

  /**
   * Map error severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Show user notification
   */
  private showUserNotification(error: AppError): void {
    const message = error.userMessage || '오류가 발생했습니다';
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        toast.error(message, {
          duration: 5000,
          action: error.retry ? {
            label: '다시 시도',
            onClick: () => window.location.reload(),
          } : undefined,
        });
        break;
      case ErrorSeverity.MEDIUM:
        toast.warning(message, { duration: 4000 });
        break;
      case ErrorSeverity.LOW:
        toast.info(message, { duration: 3000 });
        break;
    }
  }

  /**
   * Utility function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * React Error Boundary fallback component
 */
export function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <h2 className="mb-2 text-lg font-semibold text-destructive">
          오류가 발생했습니다
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {error.message || '예기치 않은 오류가 발생했습니다.'}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

/**
 * Custom hook for error handling
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: Record<string, unknown>) => {
    return errorHandler.handleError(error, context);
  };

  const handleAsyncError = async <T,>(
    fn: () => Promise<T>,
    options?: Parameters<typeof errorHandler.handleAsyncError>[1]
  ) => {
    return errorHandler.handleAsyncError(fn, options);
  };

  return {
    handleError,
    handleAsyncError,
  };
}

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleApiError(
  error: unknown,
  options?: {
    defaultMessage?: string;
    context?: string;
    statusCode?: number;
  }
) {
  const { defaultMessage = 'An error occurred', context, statusCode = 500 } = options || {};
  
  const appError = errorHandler.handleError(error, { context });
  
  return NextResponse.json(
    {
      error: appError.message || defaultMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: appError.stack,
        details: appError.context 
      })
    },
    { status: statusCode }
  );
}