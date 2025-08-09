'use client';

import { motion } from 'framer-motion';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Skeleton } from '@heroui/skeleton';
import { TrendingUp, TestTube } from 'lucide-react';

import { DashboardTrendsResponse } from '@/types/dashboard';
import { SimpleBarChart } from './charts/SimpleBarChart';
import { SimplePieChart } from './charts/SimplePieChart';

interface TrendsSectionProps {
  trends?: DashboardTrendsResponse;
  isLoading: boolean;
}

export function TrendsSection({ trends, isLoading }: TrendsSectionProps) {
  return (
    <motion.div 
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Weekly Completion Trend */}
      <Card className="lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">주간 완료율 추이</h3>
            <p className="text-sm text-slate-600">최근 4주간의 완료율 변화</p>
          </div>
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded" />
          ) : trends?.weeklyCompletionRates ? (
            <SimpleBarChart data={trends.weeklyCompletionRates} />
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>데이터가 없습니다</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Item Type Distribution */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">항목 유형 분포</h3>
            <p className="text-sm text-slate-600">검사 vs 주사 비율</p>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded" />
          ) : trends?.itemTypeDistribution ? (
            <SimplePieChart data={trends.itemTypeDistribution} />
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <TestTube className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>데이터가 없습니다</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}