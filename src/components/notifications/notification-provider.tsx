'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Toaster, toast } from 'sonner';
import { Bell } from 'lucide-react';

interface NotificationContextType {
  unreadCount: number;
  notifications: any[];
  markAsRead: (id: string) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  notifications: [],
  markAsRead: () => {},
  refreshNotifications: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const fetchNotifications = async () => {
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
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_notified).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('patient_schedules')
        .update({ is_notified: true })
        .eq('id', id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_notified: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

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
            const schedule = payload.new as any;
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
  }, []);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      markAsRead,
      refreshNotifications,
    }}>
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