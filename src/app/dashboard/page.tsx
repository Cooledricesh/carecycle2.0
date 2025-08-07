'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@heroui/button';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">데이터를 불러올 수 없습니다</h2>
          <p className="text-gray-600 mb-4">대시보드 정보를 가져오는 중 오류가 발생했습니다.</p>
          <Button onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">현황 대시보드</h1>
          <p className="text-gray-600">환자 검사·주사 일정의 전체 현황을 한눈에 확인하세요</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">총 환자 수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    `${stats?.totalPatients || 0}명`
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">오늘 예정</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    `${stats?.todayScheduled || 0}건`
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">오늘 완료율</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    `${stats?.completionRates.today || 0}%`
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">연체 항목</p>
                <p className="text-2xl font-bold text-red-600">
                  {statsLoading ? (
                    <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    `${stats?.overdueItems || 0}건`
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Completion Trend */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">주간 완료율 추이</h3>
                <p className="text-sm text-gray-600">최근 4주간의 완료율 변화</p>
              </div>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            {trendsLoading ? (
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            ) : trends?.weeklyCompletionRates ? (
              <SimpleBarChart data={trends.weeklyCompletionRates} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </div>

          {/* Item Type Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">항목 유형 분포</h3>
              <p className="text-sm text-gray-600">검사 vs 주사 비율</p>
            </div>
            {trendsLoading ? (
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            ) : trends?.itemTypeDistribution ? (
              <SimplePieChart data={trends.itemTypeDistribution} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Completion Rates Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">완료율 요약</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">오늘</p>
              <p className="text-2xl font-bold text-blue-600">
                {statsLoading ? '...' : `${stats?.completionRates.today || 0}%`}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">이번 주</p>
              <p className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : `${stats?.completionRates.thisWeek || 0}%`}
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">이번 달</p>
              <p className="text-2xl font-bold text-purple-600">
                {statsLoading ? '...' : `${stats?.completionRates.thisMonth || 0}%`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">최근 완료 내역</h3>
              <Link href="/schedule">
                <Button size="sm" variant="outline">
                  전체 보기 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : recent?.recentActivity && recent.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recent.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {activity.itemType === 'test' ? (
                        <TestTube className="w-4 h-4 text-green-600" />
                      ) : (
                        <Syringe className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.patientName} ({activity.patientNumber})
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.itemName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {new Date(activity.completedDate || activity.scheduledDate).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <div className="flex items-center mt-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-600 ml-1">완료</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>최근 완료된 항목이 없습니다</p>
              </div>
            )}
          </div>

          {/* Upcoming Schedules */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">다가오는 일정</h3>
              <Link href="/schedule">
                <Button size="sm" variant="outline">
                  전체 보기 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : recent?.upcomingSchedules && recent.upcomingSchedules.length > 0 ? (
              <div className="space-y-3">
                {recent.upcomingSchedules.slice(0, 5).map((schedule) => (
                  <div key={schedule.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
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
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {schedule.patientName} ({schedule.patientNumber})
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {schedule.itemName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {new Date(schedule.dueDate).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <div className={`text-xs mt-1 ${
                        schedule.daysDue <= 0 ? 'text-red-600' : schedule.daysDue <= 3 ? 'text-yellow-600' : 'text-blue-600'
                      }`}>
                        {schedule.daysDue <= 0 ? '오늘' : `${schedule.daysDue}일 후`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>다가오는 일정이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/patients/register">
              <Button className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>새 환자 등록</span>
              </Button>
            </Link>
            <Link href="/schedule">
              <Button variant="outline" className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>오늘 일정 확인</span>
              </Button>
            </Link>
            <Link href="/schedule">
              <Button variant="outline" className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>연체 항목 관리</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}