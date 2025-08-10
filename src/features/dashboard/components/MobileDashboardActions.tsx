/**
 * Mobile-Optimized Dashboard Actions Component
 * Provides quick actions optimized for mobile interaction
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Users, 
  Calendar, 
  Bell, 
  RefreshCw,
  Menu,
  X,
  Activity,
  Clock,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useDashboardStatus } from '@/features/dashboard/hooks/use-dashboard-data';

interface MobileDashboardActionsProps {
  className?: string;
}

export function MobileDashboardActions({ className }: MobileDashboardActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const router = useRouter();
  const { refetch } = useDashboardStatus();

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const toggleSearch = useCallback(() => {
    setShowSearchBar(prev => !prev);
    setIsMenuOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    setIsMenuOpen(false);
  }, [refetch]);

  const navigateTo = useCallback((path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  }, [router]);

  const menuItems = [
    {
      icon: <Users className="h-5 w-5" />,
      label: '환자 관리',
      action: () => navigateTo('/patients'),
      color: 'text-blue-600',
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: '일정 관리',
      action: () => navigateTo('/schedules'),
      color: 'text-green-600',
    },
    {
      icon: <Activity className="h-5 w-5" />,
      label: '오늘의 할 일',
      action: () => navigateTo('/today'),
      color: 'text-purple-600',
    },
    {
      icon: <Bell className="h-5 w-5" />,
      label: '알림 설정',
      action: () => navigateTo('/notifications'),
      color: 'text-orange-600',
    },
    {
      icon: <RefreshCw className="h-5 w-5" />,
      label: '새로고침',
      action: handleRefresh,
      color: 'text-gray-600',
    },
  ];

  return (
    <div className={`md:hidden ${className}`}>
      {/* Search Bar (when open) */}
      <AnimatePresence>
        {showSearchBar && (
          <motion.div
            className="mb-4 p-4 bg-white rounded-lg shadow-md border"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-400" />
              <Input
                placeholder="환자명 또는 환자번호로 검색..."
                className="flex-1"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearchBar(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex items-center justify-between">
          {/* Quick Add Button */}
          <Button
            size="sm"
            onClick={() => navigateTo('/patients/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">환자 추가</span>
          </Button>

          {/* Center Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSearch}
              className="flex items-center gap-1"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('/today')}
              className="flex items-center gap-1"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden xs:inline">오늘</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('/schedules')}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden xs:inline">일정</span>
            </Button>
          </div>

          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMenu}
            className={`transition-colors ${
              isMenuOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
            }`}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-30 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMenu}
            />
            
            {/* Menu Panel */}
            <motion.div
              className="fixed bottom-16 right-4 bg-white rounded-lg shadow-lg border p-2 z-50"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
            >
              <div className="grid gap-1 min-w-[200px]">
                {menuItems.map((item, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={item.action}
                    className="flex items-center justify-start gap-3 w-full h-12"
                  >
                    <span className={item.color}>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Mobile Dashboard Header Component
 * Compact header optimized for mobile screens
 */
export function MobileDashboardHeader({ 
  isConnected,
  className 
}: { 
  isConnected: boolean;
  className?: string;
}) {
  return (
    <div className={`md:hidden mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            대시보드
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
            <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '실시간' : '오프라인'}
            </span>
          </div>
        </div>
        
        {/* Mobile Quick Stats */}
        <div className="text-right">
          <div className="text-xs text-gray-500">마지막 업데이트</div>
          <div className="text-sm font-semibold text-gray-700">
            {new Date().toLocaleTimeString('ko-KR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
}