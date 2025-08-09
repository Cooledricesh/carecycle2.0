/**
 * Dashboard Feature Exports
 * Central export point for dashboard feature
 */

// Hooks
export {
  useDashboardStats,
  useDashboardRecent,
  useDashboardTrends,
  useDashboardStatus,
  type DashboardStatsQuery,
  type DashboardRecentQuery,
  type DashboardTrendsQuery
} from './hooks/use-dashboard-data';

// API Client
export { dashboardClient, dashboardQueryKeys } from './api/dashboard-client';

// Components
export { StatsCards } from './components/StatsCards';
export { TrendsSection } from './components/TrendsSection';
export { CompletionRatesSummary } from './components/CompletionRatesSummary';
export { ActivitySection } from './components/ActivitySection';
export { QuickActions } from './components/QuickActions';
export { DashboardErrorBoundary } from './components/DashboardErrorBoundary';

// Chart Components
export { SimpleBarChart } from './components/charts/SimpleBarChart';
export { SimplePieChart } from './components/charts/SimplePieChart';

// Types
export type * from './types';