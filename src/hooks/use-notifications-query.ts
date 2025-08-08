/**
 * React Query hooks for notification management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  notificationService, 
  notificationQueryKeys, 
  notificationQueryConfig 
} from '@/lib/notification-service';
import type { 
  NotificationFilter, 
  NotificationSort,
  Notification 
} from '@/types/notifications';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook to fetch notifications with caching
 */
export function useNotificationsQuery(
  filter?: NotificationFilter,
  sort?: NotificationSort
) {
  return useQuery({
    queryKey: notificationQueryKeys.list(filter, sort),
    queryFn: () => notificationService.fetchNotifications(filter, sort),
    ...notificationQueryConfig,
  });
}

/**
 * Hook to get notification statistics
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: notificationQueryKeys.stats(),
    queryFn: () => notificationService.getNotificationStats(),
    ...notificationQueryConfig,
  });
}

/**
 * Hook to mark notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      notificationService.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: notificationQueryKeys.lists() 
      });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData(
        notificationQueryKeys.lists()
      );

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: notificationQueryKeys.lists() },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.map(n => 
            n.id === notificationId 
              ? { ...n, is_notified: true } 
              : n
          );
        }
      );

      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationQueryKeys.lists(),
          context.previousNotifications
        );
      }
      toast.error('알림 읽음 처리 실패');
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: notificationQueryKeys.all 
      });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds: string[]) => 
      notificationService.markAllAsRead(notificationIds),
    onMutate: async (notificationIds) => {
      await queryClient.cancelQueries({ 
        queryKey: notificationQueryKeys.lists() 
      });

      const previousNotifications = queryClient.getQueryData(
        notificationQueryKeys.lists()
      );

      queryClient.setQueriesData(
        { queryKey: notificationQueryKeys.lists() },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.map(n => 
            notificationIds.includes(n.id) 
              ? { ...n, is_notified: true } 
              : n
          );
        }
      );

      return { previousNotifications };
    },
    onError: (err, notificationIds, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationQueryKeys.lists(),
          context.previousNotifications
        );
      }
      toast.error('알림 일괄 읽음 처리 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: notificationQueryKeys.all 
      });
      toast.success('모든 알림을 읽음으로 표시했습니다');
    },
  });
}

/**
 * Hook to dismiss a notification
 */
export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => 
      notificationService.dismissNotification(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ 
        queryKey: notificationQueryKeys.lists() 
      });

      const previousNotifications = queryClient.getQueryData(
        notificationQueryKeys.lists()
      );

      queryClient.setQueriesData(
        { queryKey: notificationQueryKeys.lists() },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.filter(n => n.id !== notificationId);
        }
      );

      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationQueryKeys.lists(),
          context.previousNotifications
        );
      }
      toast.error('알림 삭제 실패');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: notificationQueryKeys.all 
      });
      toast.success('알림을 삭제했습니다');
    },
  });
}

/**
 * Hook for real-time notification subscription
 */
export function useNotificationSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = notificationService.subscribeToNotifications(
      (notification) => {
        // Update cache with new notification
        queryClient.setQueriesData(
          { queryKey: notificationQueryKeys.lists() },
          (old: Notification[] | undefined) => {
            if (!old) return [notification];
            
            // Check if notification already exists
            const exists = old.some(n => n.id === notification.id);
            if (exists) {
              // Update existing
              return old.map(n => 
                n.id === notification.id ? notification : n
              );
            } else {
              // Add new
              return [notification, ...old];
            }
          }
        );

        // Show toast for new notifications
        if (!notification.is_notified) {
          const dueDate = new Date(notification.next_due_date);
          const today = new Date();
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilDue <= 3 && daysUntilDue >= 0) {
            toast.info('새로운 알림', {
              description: `${notification.patient?.name}님의 ${
                notification.item?.name
              } 일정이 ${daysUntilDue}일 후 예정되어 있습니다.`,
            });
          }
        }
      },
      (error) => {
        console.error('Notification subscription error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [queryClient]);
}

/**
 * Combined hook for complete notification functionality
 */
export function useNotifications(
  filter?: NotificationFilter,
  sort?: NotificationSort
) {
  const query = useNotificationsQuery(filter, sort);
  const stats = useNotificationStats();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const dismiss = useDismissNotification();

  // Enable real-time updates
  useNotificationSubscription();

  return {
    // Data
    notifications: query.data || [],
    stats: stats.data,
    
    // Loading states
    isLoading: query.isLoading,
    isLoadingStats: stats.isLoading,
    
    // Error states
    error: query.error,
    statsError: stats.error,
    
    // Mutations
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    dismiss: dismiss.mutate,
    
    // Mutation states
    isMarkingAsRead: markAsRead.isPending,
    isMarkingAllAsRead: markAllAsRead.isPending,
    isDismissing: dismiss.isPending,
    
    // Refetch functions
    refetch: query.refetch,
    refetchStats: stats.refetch,
  };
}