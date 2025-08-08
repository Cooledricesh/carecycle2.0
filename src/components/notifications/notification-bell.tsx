'use client';

import { useState } from 'react';
import { Bell, BellOff, Calendar, Clock, User } from 'lucide-react';
import { useNotifications } from './notification-provider';
import { Button } from '@heroui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@heroui/popover';
import { Badge } from '@heroui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export function NotificationBell() {
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_notified) {
      markAsRead(notification.id);
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const daysUntilDue = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue === 0) return '오늘';
    if (daysUntilDue === 1) return '내일';
    if (daysUntilDue === 2) return '모레';
    return `${daysUntilDue}일 후`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">알림</h3>
          <p className="text-sm text-muted-foreground">
            예정된 검사 및 주사 일정
          </p>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BellOff className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                예정된 알림이 없습니다
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    !notification.is_notified ? 'bg-muted/20' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {notification.patient?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({notification.patient?.patient_number})
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm">
                            {notification.item?.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {notification.item?.type === 'injection' ? '주사' : '검사'}
                          </Badge>
                        </div>
                      </div>
                      {!notification.is_notified && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(notification.next_due_date), 'M월 d일 (EEE)', { locale: ko })}
                      </span>
                      <Clock className="ml-2 h-3 w-3" />
                      <span className="font-medium text-primary">
                        {formatDueDate(notification.next_due_date)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setIsOpen(false)}
            >
              모든 알림 보기
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}