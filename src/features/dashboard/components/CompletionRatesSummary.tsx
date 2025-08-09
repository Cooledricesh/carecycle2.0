'use client';

import { motion } from 'framer-motion';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Skeleton } from '@heroui/skeleton';

import { DashboardStatsResponse } from '@/types/dashboard';

interface CompletionRatesSummaryProps {
  stats?: DashboardStatsResponse;
  isLoading: boolean;
}

export function CompletionRatesSummary({ stats, isLoading }: CompletionRatesSummaryProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="mb-8 hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">완료율 요약</h3>
            <p className="text-sm text-slate-600">기간별 완료율 현황</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Today */}
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <p className="text-sm text-slate-600 mb-2">오늘</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-bold text-blue-600">
                  {`${stats?.completionRates.today || 0}%`}
                </p>
              )}
            </div>
            
            {/* This Week */}
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
              <p className="text-sm text-slate-600 mb-2">이번 주</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  {`${stats?.completionRates.thisWeek || 0}%`}
                </p>
              )}
            </div>
            
            {/* This Month */}
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200">
              <p className="text-sm text-slate-600 mb-2">이번 달</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mx-auto rounded" />
              ) : (
                <p className="text-3xl font-bold text-purple-600">
                  {`${stats?.completionRates.thisMonth || 0}%`}
                </p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}