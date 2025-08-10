/**
 * Real-time Dashboard Updates Hook
 * Manages Supabase realtime subscriptions for live dashboard updates
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { dashboardQueryKeys } from '../api/dashboard-client';
import { toast } from 'sonner';
import { Bell, Activity, Calendar, TrendingUp } from 'lucide-react';

export interface DashboardRealtimeOptions {
  /**
   * Enable toast notifications for real-time updates
   */
  enableToastNotifications?: boolean;
  
  /**
   * Custom notification handlers
   */
  onStatsUpdate?: () => void;
  onActivityUpdate?: () => void;
  onScheduleUpdate?: () => void;
  
  /**
   * Debug mode for logging
   */
  debug?: boolean;
}

export function useDashboardRealtime(options: DashboardRealtimeOptions = {}) {
  const {
    enableToastNotifications = true,
    onStatsUpdate,
    onActivityUpdate,
    onScheduleUpdate,
    debug = false
  } = options;

  const queryClient = useQueryClient();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[Dashboard Realtime] ${message}`, data || '');
    }
  }, [debug]);

  const showNotification = useCallback((title: string, message: string, icon: React.ReactNode) => {
    if (enableToastNotifications) {
      toast.info(title, {
        description: message,
        icon,
        duration: 4000,
      });
    }
  }, [enableToastNotifications]);

  const handleDashboardUpdate = useCallback((payload: any) => {
    log('Dashboard update received:', payload);

    const { event, table, operation, record_id } = payload;
    
    switch (table) {
      case 'patients':
        // Patient data changed - refresh stats and recent activity
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.recent() });
        
        if (operation === 'INSERT') {
          showNotification(
            '새 환자 등록',
            '새로운 환자가 시스템에 추가되었습니다.',
            <Bell className="h-4 w-4" />
          );
        }
        
        onStatsUpdate?.();
        break;

      case 'patient_schedules':
        // Schedule data changed - refresh all dashboard data
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.recent() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.trends() });
        
        if (operation === 'UPDATE') {
          showNotification(
            '일정 업데이트',
            '환자 일정이 변경되었습니다.',
            <Calendar className="h-4 w-4" />
          );
        } else if (operation === 'INSERT') {
          showNotification(
            '새 일정 추가',
            '새로운 환자 일정이 등록되었습니다.',
            <Calendar className="h-4 w-4" />
          );
        }
        
        onScheduleUpdate?.();
        break;

      case 'schedule_history':
        // Completion status changed - refresh all data for accurate metrics
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.stats() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.recent() });
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.trends() });
        
        if (operation === 'INSERT' || operation === 'UPDATE') {
          showNotification(
            '검사/주사 완료',
            '새로운 검사 또는 주사가 완료되었습니다.',
            <Activity className="h-4 w-4" />
          );
        }
        
        onActivityUpdate?.();
        break;

      default:
        log(`Unknown table update: ${table}`);
        // Refresh all data for safety
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() });
    }
  }, [queryClient, log, showNotification, onStatsUpdate, onActivityUpdate, onScheduleUpdate]);

  const subscribeToUpdates = useCallback(() => {
    log('Setting up dashboard real-time subscriptions...');

    // Create a single channel for all dashboard updates
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients'
        },
        (payload) => handleDashboardUpdate({
          event: 'data_changed',
          table: 'patients',
          operation: payload.eventType,
          record_id: payload.new?.id || payload.old?.id,
          payload
        })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_schedules'
        },
        (payload) => handleDashboardUpdate({
          event: 'data_changed',
          table: 'patient_schedules',
          operation: payload.eventType,
          record_id: payload.new?.id || payload.old?.id,
          payload
        })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_history'
        },
        (payload) => handleDashboardUpdate({
          event: 'data_changed',
          table: 'schedule_history',
          operation: payload.eventType,
          record_id: payload.new?.id || payload.old?.id,
          payload
        })
      )
      .on(
        'broadcast',
        { event: 'dashboard_update' },
        (payload) => {
          log('Dashboard broadcast received:', payload);
          handleDashboardUpdate(payload.payload);
        }
      )
      .subscribe();

    channelRef.current = channel;
    log('Dashboard real-time subscriptions active');

    return channel;
  }, [supabase, handleDashboardUpdate, log]);

  const unsubscribeFromUpdates = useCallback(() => {
    if (channelRef.current) {
      log('Unsubscribing from dashboard real-time updates...');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, [log]);

  // Set up subscriptions on mount, cleanup on unmount
  useEffect(() => {
    const channel = subscribeToUpdates();

    return () => {
      unsubscribeFromUpdates();
    };
  }, [subscribeToUpdates, unsubscribeFromUpdates]);

  // Provide manual control functions
  const refreshAllData = useCallback(() => {
    log('Manually refreshing all dashboard data...');
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all() });
  }, [queryClient, log]);

  const broadcastUpdate = useCallback((updateType: string, data?: any) => {
    if (channelRef.current) {
      log(`Broadcasting dashboard update: ${updateType}`, data);
      channelRef.current.send({
        type: 'broadcast',
        event: 'dashboard_update',
        payload: {
          event: updateType,
          timestamp: Date.now(),
          data
        }
      });
    }
  }, [log]);

  return {
    // Control functions
    refreshAllData,
    broadcastUpdate,
    
    // Status
    isConnected: channelRef.current !== null,
    
    // Manual subscription control (for advanced use cases)
    subscribe: subscribeToUpdates,
    unsubscribe: unsubscribeFromUpdates,
  };
}

/**
 * Simple hook for basic dashboard real-time updates
 * Uses default settings for most common use cases
 */
export function useDashboardRealtimeBasic() {
  return useDashboardRealtime({
    enableToastNotifications: true,
    debug: process.env.NODE_ENV === 'development',
  });
}