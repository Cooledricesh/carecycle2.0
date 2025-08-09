'use client';

import { motion } from 'framer-motion';

// Import custom hooks and components following clean architecture
import { 
  useDashboardStats, 
  useDashboardRecent, 
  useDashboardTrends 
} from '@/features/dashboard/hooks/use-dashboard-data';

import { StatsCards } from '@/features/dashboard/components/StatsCards';
import { TrendsSection } from '@/features/dashboard/components/TrendsSection';
import { CompletionRatesSummary } from '@/features/dashboard/components/CompletionRatesSummary';
import { ActivitySection } from '@/features/dashboard/components/ActivitySection';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { DashboardErrorBoundary } from '@/features/dashboard/components/DashboardErrorBoundary';

export default function Dashboard() {
  // Use custom hooks for data fetching
  const statsQuery = useDashboardStats();
  const recentQuery = useDashboardRecent();
  const trendsQuery = useDashboardTrends();

  // Handle errors with centralized error boundary
  const hasError = statsQuery.error || recentQuery.error || trendsQuery.error;
  const error = statsQuery.error || recentQuery.error || trendsQuery.error;

  if (hasError) {
    return (
      <DashboardErrorBoundary
        error={error}
        onRetry={() => {
          statsQuery.refetch();
          recentQuery.refetch();
          trendsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            실시간 대시보드
          </h1>
          <p className="text-slate-600 text-lg">환자 검사·주사 일정의 전체 현황을 한눈에 확인하세요</p>
        </motion.div>

        {/* Stats Cards */}
        <StatsCards 
          {...(statsQuery.data && { stats: statsQuery.data })}
          isLoading={statsQuery.isLoading} 
        />

        {/* Trends Section - Weekly completion rates and item distribution */}
        <TrendsSection 
          {...(trendsQuery.data && { trends: trendsQuery.data })}
          isLoading={trendsQuery.isLoading} 
        />

        {/* Completion Rates Summary */}
        <CompletionRatesSummary 
          {...(statsQuery.data && { stats: statsQuery.data })}
          isLoading={statsQuery.isLoading} 
        />

        {/* Activity Section - Recent activity and upcoming schedules */}
        <ActivitySection 
          {...(recentQuery.data && { recent: recentQuery.data })}
          isLoading={recentQuery.isLoading} 
        />

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  );
}