'use client';

import { motion } from 'framer-motion';

// Import custom hooks and components following clean architecture
import { 
  useDashboardStats, 
  useDashboardRecent, 
  useDashboardTrends 
} from '@/features/dashboard/hooks/use-dashboard-data';
import { useDashboardRealtimeBasic } from '@/features/dashboard/hooks/use-dashboard-realtime';

import { StatsCards } from '@/features/dashboard/components/StatsCards';
import { TrendsSection } from '@/features/dashboard/components/TrendsSection';
import { CompletionRatesSummary } from '@/features/dashboard/components/CompletionRatesSummary';
import { ActivitySection } from '@/features/dashboard/components/ActivitySection';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { DashboardErrorBoundary } from '@/features/dashboard/components/DashboardErrorBoundary';
import { 
  MobileDashboardActions, 
  MobileDashboardHeader 
} from '@/features/dashboard/components/MobileDashboardActions';

export default function Dashboard() {
  // Use custom hooks for data fetching
  const statsQuery = useDashboardStats();
  const recentQuery = useDashboardRecent();
  const trendsQuery = useDashboardTrends();
  
  // Set up real-time updates for live dashboard
  const { isConnected } = useDashboardRealtimeBasic();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Mobile Header */}
        <MobileDashboardHeader isConnected={isConnected} />

        {/* Desktop Header */}
        <motion.div 
          className="hidden md:block mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              실시간 대시보드
            </h1>
            {/* Real-time connection indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? '실시간 연결됨' : '연결 끊어짐'}
              </span>
            </div>
          </div>
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

        {/* Desktop Quick Actions */}
        <div className="hidden md:block">
          <QuickActions />
        </div>

        {/* Mobile Dashboard Actions */}
        <MobileDashboardActions />
      </div>
    </div>
  );
}