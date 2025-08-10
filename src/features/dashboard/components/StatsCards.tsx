'use client';

import { motion } from 'framer-motion';
import { Card, CardBody } from '@heroui/card';
import { Skeleton } from '@heroui/skeleton';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

import { DashboardStatsResponse } from '@/types/dashboard';

interface StatsCardsProps {
  stats?: DashboardStatsResponse;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  return (
    <motion.div 
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Total Patients */}
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
        <CardBody className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-2 md:mb-0">
              <p className="text-xs md:text-sm text-slate-600 mb-1">총 환자 수</p>
              {isLoading ? (
                <Skeleton className="h-6 md:h-8 w-12 md:w-16 rounded" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-slate-800">
                  <span className="md:hidden">{stats?.totalPatients || 0}</span>
                  <span className="hidden md:inline">{`${stats?.totalPatients || 0}명`}</span>
                </p>
              )}
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg self-end md:self-auto">
              <Users className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Today Scheduled */}
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
        <CardBody className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-2 md:mb-0">
              <p className="text-xs md:text-sm text-slate-600 mb-1">오늘 예정</p>
              {isLoading ? (
                <Skeleton className="h-6 md:h-8 w-12 md:w-16 rounded" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-slate-800">
                  <span className="md:hidden">{stats?.todayScheduled || 0}</span>
                  <span className="hidden md:inline">{`${stats?.todayScheduled || 0}건`}</span>
                </p>
              )}
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg self-end md:self-auto">
              <Calendar className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Today Completion Rate */}
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200">
        <CardBody className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-2 md:mb-0">
              <p className="text-xs md:text-sm text-slate-600 mb-1">오늘 완료율</p>
              {isLoading ? (
                <Skeleton className="h-6 md:h-8 w-12 md:w-16 rounded" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-slate-800">
                  {`${stats?.completionRates.today || 0}%`}
                </p>
              )}
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg self-end md:self-auto">
              <CheckCircle2 className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Overdue Items */}
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-200">
        <CardBody className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-2 md:mb-0">
              <p className="text-xs md:text-sm text-slate-600 mb-1">연체 항목</p>
              {isLoading ? (
                <Skeleton className="h-6 md:h-8 w-12 md:w-16 rounded" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-red-600">
                  <span className="md:hidden">{stats?.overdueItems || 0}</span>
                  <span className="hidden md:inline">{`${stats?.overdueItems || 0}건`}</span>
                </p>
              )}
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg self-end md:self-auto">
              <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}