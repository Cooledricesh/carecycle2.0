/**
 * Notification Service
 * Handles business logic for notifications separate from React components
 */

import { createClient } from '@/lib/supabase/client';
import type { 
  Notification, 
  NotificationFilter, 
  NotificationSort,
  EnhancedNotification 
} from '@/types/notifications';
import { NotificationPriority, NotificationStatus } from '@/types/notifications';
import type { PatientScheduleWithRelations } from '@/types/supabase';
import { NotificationSchema } from '@/types/notifications';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STALE_TIME = 60 * 1000; // 1 minute

export class NotificationService {
  private supabase = createClient();

  /**
   * Fetch notifications with optional filtering and sorting
   */
  async fetchNotifications(
    filter?: NotificationFilter,
    sort?: NotificationSort
  ): Promise<Notification[]> {
    try {
      const today = new Date();
      const notificationWindow = filter?.dateRange || {
        start: today,
        end: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days ahead
      };

      let query = this.supabase
        .from('patient_schedules')
        .select(`
          id,
          patient_id,
          item_id,
          next_due_date,
          first_date,
          last_completed_date,
          is_notified,
          is_active,
          created_at,
          updated_at,
          patients!patient_schedules_patient_id_fkey (
            id,
            name,
            patient_number,
            created_at,
            updated_at
          ),
          items!patient_schedules_item_id_fkey (
            id,
            name,
            type,
            period_value,
            period_unit
          )
        `)
        .gte('next_due_date', notificationWindow.start.toISOString().split('T')[0])
        .lte('next_due_date', notificationWindow.end.toISOString().split('T')[0])
        .eq('is_active', true);

      // Apply filters
      if (filter?.patientId) {
        query = query.eq('patient_id', filter.patientId);
      }
      if (filter?.isUnread !== undefined) {
        query = query.eq('is_notified', !filter.isUnread);
      }

      // Apply sorting
      const sortField = sort?.field || 'next_due_date';
      const sortOrder = sort?.order || 'asc';
      query = query.order(sortField === 'dueDate' ? 'next_due_date' : sortField, { 
        ascending: sortOrder === 'asc' 
      });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      // Transform and validate data
      return this.transformSchedulesToNotifications(data || []);
    } catch (error) {
      console.error('NotificationService.fetchNotifications error:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('patient_schedules')
      .update({ is_notified: true })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;

    const { error } = await this.supabase
      .from('patient_schedules')
      .update({ is_notified: true })
      .in('id', notificationIds);

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Dismiss a notification
   */
  async dismissNotification(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('patient_schedules')
      .update({ is_active: false })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to dismiss notification: ${error.message}`);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    today: number;
    upcoming: number;
    overdue: number;
  }> {
    const notifications = await this.fetchNotifications();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.is_notified).length,
      today: notifications.filter(n => {
        const dueDate = new Date(n.next_due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      }).length,
      upcoming: notifications.filter(n => {
        const dueDate = new Date(n.next_due_date);
        return dueDate.getTime() > today.getTime();
      }).length,
      overdue: notifications.filter(n => {
        const dueDate = new Date(n.next_due_date);
        return dueDate.getTime() < today.getTime();
      }).length,
    };
  }

  /**
   * Transform patient schedules to notifications
   */
  private transformSchedulesToNotifications(
    schedules: any[]
  ): Notification[] {
    return schedules
      .map(schedule => {
        try {
          const notification: Notification = {
            id: schedule.id,
            patient_id: schedule.patient_id,
            item_id: schedule.item_id,
            next_due_date: schedule.next_due_date,
            is_notified: schedule.is_notified ?? false,
            is_active: schedule.is_active ?? true,
            created_at: schedule.created_at,
            updated_at: schedule.updated_at,
            patient: schedule.patients ? {
              id: schedule.patients.id,
              name: schedule.patients.name,
              patient_number: schedule.patients.patient_number,
            } as any : undefined,
            item: schedule.items ? {
              id: schedule.items.id,
              name: schedule.items.name,
              type: schedule.items.type as 'test' | 'injection',
              period_value: schedule.items.period_value,
              period_unit: schedule.items.period_unit as 'weeks' | 'months',
            } as any : undefined,
          };

          // Validate with Zod schema
          const result = NotificationSchema.safeParse(notification);
          if (result.success) {
            return result.data;
          } else {
            console.warn('Invalid notification data:', result.error);
            return null;
          }
        } catch (error) {
          console.error('Error transforming schedule to notification:', error);
          return null;
        }
      })
      .filter((n): n is Notification => n !== null);
  }

  /**
   * Enhance notification with computed properties
   */
  enhanceNotification(notification: Notification): EnhancedNotification {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(notification.next_due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine priority
    let priority: NotificationPriority;
    if (daysUntilDue < 0) {
      priority = NotificationPriority.URGENT;
    } else if (daysUntilDue === 0) {
      priority = NotificationPriority.HIGH;
    } else if (daysUntilDue <= 2) {
      priority = NotificationPriority.MEDIUM;
    } else {
      priority = NotificationPriority.LOW;
    }

    // Determine status
    let status: NotificationStatus;
    if (notification.is_notified) {
      status = NotificationStatus.READ;
    } else if (daysUntilDue < -7) {
      status = NotificationStatus.EXPIRED;
    } else {
      status = NotificationStatus.PENDING;
    }

    // Format due date
    let formattedDueDate: string;
    if (daysUntilDue === 0) {
      formattedDueDate = '오늘';
    } else if (daysUntilDue === 1) {
      formattedDueDate = '내일';
    } else if (daysUntilDue === 2) {
      formattedDueDate = '모레';
    } else if (daysUntilDue < 0) {
      formattedDueDate = `${Math.abs(daysUntilDue)}일 지연`;
    } else {
      formattedDueDate = `${daysUntilDue}일 후`;
    }

    return {
      ...notification,
      daysUntilDue,
      priority,
      status,
      formattedDueDate,
      isOverdue: daysUntilDue < 0,
      isToday: daysUntilDue === 0,
      isTomorrow: daysUntilDue === 1,
    };
  }

  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(
    onUpdate: (notification: Notification) => void,
    onError?: (error: Error) => void
  ) {
    const channel = this.supabase
      .channel('notification-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_schedules',
        },
        async (payload) => {
          try {
            if (payload.new) {
              const transformed = this.transformSchedulesToNotifications([payload.new as any]);
              if (transformed.length > 0 && transformed[0]) {
                onUpdate(transformed[0]);
              }
            }
          } catch (error) {
            onError?.(error as Error);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// React Query keys
export const notificationQueryKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationQueryKeys.all, 'list'] as const,
  list: (filter?: NotificationFilter, sort?: NotificationSort) => 
    [...notificationQueryKeys.lists(), { filter, sort }] as const,
  details: () => [...notificationQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationQueryKeys.details(), id] as const,
  stats: () => [...notificationQueryKeys.all, 'stats'] as const,
};

// React Query configuration
export const notificationQueryConfig = {
  staleTime: STALE_TIME,
  cacheTime: CACHE_TTL,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};