import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

// Check if all required Sentry environment variables are present
const hasSentryEnv = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN &&
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Organization and project from environment variables (no defaults)
  org: process.env.SENTRY_ORG || '',
  project: process.env.SENTRY_PROJECT || '',
  
  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN || '',
  
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  
  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
  
  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",
  
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  
  // Hide source maps from the client
  hideSourceMaps: true,
  
  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
  
  // Automatically release tracking
  release: {
    create: true,
    finalize: true,
    deploy: {
      env: process.env.NODE_ENV || 'development',
    },
  },
};

// Export with Sentry wrapper only if all required environment variables are configured
export default hasSentryEnv
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;