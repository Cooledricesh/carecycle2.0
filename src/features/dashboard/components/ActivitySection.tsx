'use client';

import { motion } from 'framer-motion';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Skeleton } from '@heroui/skeleton';
import { 
  Clock, 
  Calendar, 
  TestTube, 
  Syringe, 
  ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

import { DashboardRecentResponse } from '@/types/dashboard';

interface ActivitySectionProps {
  recent?: DashboardRecentResponse;
  isLoading: boolean;
}

export function ActivitySection({ recent, isLoading }: ActivitySectionProps) {
  return (
    <motion.div 
      className="grid grid-cols-1 xl:grid-cols-2 gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      {/* Recent Activity */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">최근 완료 내역</h3>
            <p className="text-sm text-slate-600">최근 완료된 검사·주사 항목</p>
          </div>
          <Link href="/schedule">
            <Button size="sm" variant="flat" color="primary" endContent={<ArrowRight className="w-4 h-4" />}>
              전체 보기
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : recent?.recentActivity && recent.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recent.recentActivity.slice(0, 5).map((activity) => (
                <motion.div 
                  key={activity.id} 
                  className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:shadow-sm transition-all duration-200"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {activity.itemType === 'test' ? (
                      <TestTube className="w-4 h-4 text-green-600" />
                    ) : (
                      <Syringe className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {activity.patientName} ({activity.patientNumber})
                    </p>
                    <p className="text-sm text-slate-600 truncate">
                      {activity.itemName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">
                      {new Date(activity.completedDate || activity.scheduledDate).toLocaleDateString('ko-KR', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <Chip size="sm" color="success" variant="flat" className="mt-1">
                      완료
                    </Chip>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>최근 완료된 항목이 없습니다</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Upcoming Schedules */}
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">다가오는 일정</h3>
            <p className="text-sm text-slate-600">예정된 검사·주사 항목</p>
          </div>
          <Link href="/schedule">
            <Button size="sm" variant="flat" color="primary" endContent={<ArrowRight className="w-4 h-4" />}>
              전체 보기
            </Button>
          </Link>
        </CardHeader>
        <CardBody className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : recent?.upcomingSchedules && recent.upcomingSchedules.length > 0 ? (
            <div className="space-y-3">
              {recent.upcomingSchedules.slice(0, 5).map((schedule) => (
                <motion.div 
                  key={schedule.id} 
                  className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:shadow-sm transition-all duration-200"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    schedule.daysDue <= 0 ? 'bg-red-100' : schedule.daysDue <= 3 ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    {schedule.itemType === 'test' ? (
                      <TestTube className={`w-4 h-4 ${
                        schedule.daysDue <= 0 ? 'text-red-600' : schedule.daysDue <= 3 ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    ) : (
                      <Syringe className={`w-4 h-4 ${
                        schedule.daysDue <= 0 ? 'text-red-600' : schedule.daysDue <= 3 ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {schedule.patientName} ({schedule.patientNumber})
                    </p>
                    <p className="text-sm text-slate-600 truncate">
                      {schedule.itemName}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">
                      {new Date(schedule.dueDate).toLocaleDateString('ko-KR', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <Chip 
                      size="sm" 
                      color={schedule.daysDue <= 0 ? 'danger' : schedule.daysDue <= 3 ? 'warning' : 'primary'}
                      variant="flat"
                      className="mt-1"
                    >
                      {schedule.daysDue <= 0 ? '오늘' : `${schedule.daysDue}일 후`}
                    </Chip>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>다가오는 일정이 없습니다</p>
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
}