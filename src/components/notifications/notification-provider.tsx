'use client';

import { useEffect, useState, createContext, useContext, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Toaster, toast } from 'sonner';
import { Bell } from 'lucide-react';
import type { 
  Notification, 
  NotificationContextType, 
  RealtimePayload,
  RealtimeEventType 
} from '@/types/notifications';
import type { PatientScheduleWithRelations } from '@/types/supabase';
import { NotificationSchema } from '@/types/notifications';

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  notifications: [],
  isLoading: false,
  error: null,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshNotifications: async () => {},
  dismissNotification: async () => {},
  updateNotificationSettings: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get upcoming schedules that need notification
      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      const { data, error } = await supabase
        .from('patient_schedules')
        .select(`
          id,
          next_due_date,
          is_notified,
          patient:patients!patient_id (
            name,
            patient_number
          ),
          item:items!item_id (
            name,
            type
          )
        `)
        .gte('next_due_date', today.toISOString().split('T')[0])
        .lte('next_due_date', threeDaysFromNow.toISOString().split('T')[0])
        .eq('is_active', true)
        .order('next_due_date', { ascending: true });

      if (!error && data) {
        // Validate and transform data
        const validNotifications = data.map(item => {
          // Handle the case where patient/item might be arrays (shouldn't happen with our query but let's be safe)
          const patient = Array.isArray(item.patient) ? item.patient[0] : item.patient;
          const itemData = Array.isArray(item.item) ? item.item[0] : item.item;
          
          return {
            id: item.id,
            patient_id: (patient as any)?.id ?? '',
            item_id: (itemData as any)?.id ?? '',
            next_due_date: item.next_due_date,
            is_notified: item.is_notified ?? false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            patient: patient ? {
              id: (patient as any).id ?? '',
              name: patient.name ?? '',
              patient_number: patient.patient_number ?? '',
            } : undefined,
            item: itemData ? {
              id: (itemData as any).id ?? '',
              name: itemData.name ?? '',
              type: (itemData.type as 'test' | 'injection') ?? 'test',
              period_value: 0,
              period_unit: 'weeks' as const,
            } : undefined,
          } as Notification;
        });
        
        setNotifications(validNotifications);
        setUnreadCount(validNotifications.filter(n => !n.is_notified).length);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to fetch notifications');
      console.error('Failed to fetch notifications:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await supabase
        .from('patient_schedules')
        .update({ is_notified: true })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_notified: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to mark notification as read');
      console.error('Failed to mark notification as read:', errorMessage);
      setError(errorMessage);
    }
  }, [supabase]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_notified).map(n => n.id);
      if (unreadIds.length === 0) return;
      
      await supabase
        .from('patient_schedules')
        .update({ is_notified: true })
        .in('id', unreadIds);
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_notified: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to mark all as read');
      console.error('Failed to mark all as read:', errorMessage);
      setError(errorMessage);
    }
  }, [notifications, supabase]);

  const dismissNotification = useCallback(async (id: string) => {
    try {
      await supabase
        .from('patient_schedules')
        .update({ is_active: false })
        .eq('id', id);
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === id);
        return notification && !notification.is_notified ? prev - 1 : prev;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to dismiss notification');
      console.error('Failed to dismiss notification:', errorMessage);
      setError(errorMessage);
    }
  }, [notifications, supabase]);

  const updateNotificationSettings = useCallback(async () => {
    // Placeholder for future notification settings implementation
    console.log('Notification settings update not yet implemented');
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription for notification updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_schedules',
        },
        (payload) => {
          // Refresh notifications when patient_schedules changes
          fetchNotifications();
          
          // Show toast notification for new upcoming schedules
          if (payload.eventType === 'UPDATE' && payload.new) {
            const schedule = payload.new as PatientScheduleWithRelations;
            if (schedule.next_due_date) {
              const dueDate = new Date(schedule.next_due_date);
              const today = new Date();
              const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysUntilDue <= 3 && daysUntilDue >= 0) {
                toast.info('일정 알림', {
                  description: `${daysUntilDue}일 후 예정된 일정이 있습니다.`,
                  icon: <Bell className="h-4 w-4" />,
                  duration: 5000,
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Refresh notifications every 30 minutes
    const interval = setInterval(fetchNotifications, 30 * 60 * 1000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchNotifications, supabase]);

  const contextValue = useMemo(() => ({
    unreadCount,
    notifications,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    dismissNotification,
    updateNotificationSettings,
  }), [unreadCount, notifications, isLoading, error, markAsRead, markAllAsRead, refreshNotifications, dismissNotification, updateNotificationSettings]);

  return (
    <NotificationContext.Provider value={contextValue}>
      <Toaster 
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />
      {children}
    </NotificationContext.Provider>
  );
}