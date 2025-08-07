import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'development',
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Integrations
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
      Sentry.browserTracingIntegration(),
    ],
    
    // Filtering
    beforeSend(event, hint) {
      // Filter out non-error events in development
      if (process.env.NODE_ENV === 'development') {
        if (event.level === 'info' || event.level === 'log') {
          return null;
        }
      }
      
      // Don't send sensitive data
      if (event.request?.cookies) {
        delete event.request.cookies;
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      // User cancellations
      'AbortError',
      'Non-Error promise rejection captured',
    ],
    
    // Don't log certain transactions
    ignoreTransactions: [
      '/api/health',
      '/_next/static/',
      '/favicon.ico',
    ],
  });
}