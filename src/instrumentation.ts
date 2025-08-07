import * as Sentry from '@sentry/nextjs';

/**
 * Dynamically loads the appropriate Sentry configuration based on the current Next.js runtime environment.
 *
 * Loads the server-side configuration if running in a Node.js environment, or the edge configuration if running in an Edge environment.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
