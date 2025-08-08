'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Skeleton } from '@heroui/skeleton';
import { Divider } from '@heroui/divider';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Clock,
  Syringe,
  TestTube,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  DashboardStatsResponse, 
  DashboardRecentResponse, 
  DashboardTrendsResponse 
} from '@/types/dashboard';

// Simple chart components using CSS and SVG
const SimpleBarChart = ({ data }: { data: { week: string; weekLabel: string; completionRate: number; completedCount: number; totalScheduled: number }[] }) => {
  const maxRate = Math.max(...data.map(d => d.completionRate), 100);
  
  return (
    <div className="flex items-end justify-between h-32 space-x-2">
      {data.map((item, index) => (
        <div key={item.week} className="flex-1 flex flex-col items-center">
          <div className="flex-1 flex items-end">
            <div 
              className="bg-blue-500 rounded-t-sm min-h-1 transition-all duration-500 ease-out"
              style={{ 
                height: `${(item.completionRate / maxRate) * 100}%`,
                minHeight: item.completionRate > 0 ? '4px' : '1px'
              }}
              title={`${item.completionRate}% (${item.completedCount}/${item.totalScheduled})`}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">{item.weekLabel}</div>
        </div>
      ))}
    </div>
  );
};

const SimplePieChart = ({ data }: { data: { type: 'test' | 'injection'; count: number; percentage: number }[] }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const testPercentage = data.find(d => d.type === 'test')?.percentage || 0;
  const testOffset = circumference - (testPercentage / 100) * circumference;
  
  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <svg width="100" height="100" className="transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#3b82f6"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={testOffset}
            className="transition-all duration-500 ease-out"
          />
          <circle
            cx="50"
            cy="50"
            r={radius - 12}
            stroke="#10b981"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - ((data.find(d => d.type === 'injection')?.percentage || 0) / 100) * circumference}
            className="transition-all duration-500 ease-out"
          />
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.type} className="flex items-center space-x-2">
            <div 
              className={`w-3 h-3 rounded-full ${item.type === 'test' ? 'bg-blue-500' : 'bg-green-500'}`}
            />
            <span className="text-sm">
              {item.type === 'test' ? '검사' : '주사'}: {item.count}건 ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStatsResponse>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: recent, isLoading: recentLoading } = useQuery<DashboardRecentResponse>({
    queryKey: ['dashboard', 'recent'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/recent');
      if (!response.ok) {
        throw new Error('Failed to fetch recent dashboard data');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<DashboardTrendsResponse>({
    queryKey: ['dashboard', 'trends'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/trends');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard trends');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (statsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardBody className="text-center p-8">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">데이터를 불러올 수 없습니다</h2>
            <p className="text-default-500 mb-6">대시보드 정보를 가져오는 중 오류가 발생했습니다.</p>
            <Button color="primary" onClick={() => window.location.reload()}>다시 시도</Button>
          </CardBody>
        </Card>
      </div>
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
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">총 환자 수</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 rounded" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-800">
                      {`${stats?.totalPatients || 0}명`}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">오늘 예정</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 rounded" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-800">
                      {`${stats?.todayScheduled || 0}건`}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">오늘 완료율</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 rounded" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-800">
                      {`${stats?.completionRates.today || 0}%`}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-red-50 to-rose-100 border-2 border-red-200">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">연체 항목</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 rounded" />
                  ) : (
                    <p className="text-2xl font-bold text-red-600">
                      {`${stats?.overdueItems || 0}건`}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

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
              {trendsLoading ? (
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
              {trendsLoading ? (
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

        {/* Completion Rates Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="mb-8 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">완료율 요약</h3>
              <p className="text-sm text-slate-600">기간별 완료율 현황</p>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <p className="text-sm text-slate-600 mb-2">오늘</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mx-auto rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-blue-600">
                      {`${stats?.completionRates.today || 0}%`}
                    </p>
                  )}
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl border border-green-200">
                  <p className="text-sm text-slate-600 mb-2">이번 주</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mx-auto rounded" />
                  ) : (
                    <p className="text-3xl font-bold text-green-600">
                      {`${stats?.completionRates.thisWeek || 0}%`}
                    </p>
                  )}
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200">
                  <p className="text-sm text-slate-600 mb-2">이번 달</p>
                  {statsLoading ? (
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
              {recentLoading ? (
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
              {recentLoading ? (
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

        {/* Quick Actions */}
        <motion.div 
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">빠른 작업</h3>
                <p className="text-sm text-slate-600">자주 사용하는 기능에 빠르게 접근하세요</p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-3">
                <Link href="/patients/register">
                  <Button 
                    color="primary" 
                    size="lg"
                    startContent={<Users className="w-4 h-4" />}
                    className="font-medium"
                  >
                    새 환자 등록
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button 
                    color="success"
                    variant="flat" 
                    size="lg"
                    startContent={<Calendar className="w-4 h-4" />}
                    className="font-medium"
                  >
                    오늘 일정 확인
                  </Button>
                </Link>
                <Link href="/schedule">
                  <Button 
                    color="warning"
                    variant="flat" 
                    size="lg"
                    startContent={<AlertCircle className="w-4 h-4" />}
                    className="font-medium"
                  >
                    연체 항목 관리
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}