/**
 * Notification System Type Definitions
 * Provides comprehensive type safety for the notification feature
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export enum NotificationType {
  TEST = 'test',
  INJECTION = 'injection',
}

export enum NotificationStatus {
  PENDING = 'pending',
  READ = 'read',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============================================================================
// Core Types
// ============================================================================

/**
 * Patient information for notifications
 */
export interface NotificationPatient {
  id: string;
  name: string;
  patient_number: string;
}

/**
 * Medical item (test or injection) information
 */
export interface NotificationItem {
  id: string;
  name: string;
  type: NotificationType;
  period_value: number;
  period_unit: 'weeks' | 'months';
}

/**
 * Main notification interface
 */
export interface Notification {
  id: string;
  patient_id: string;
  item_id: string;
  next_due_date: string;
  is_notified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  patient?: NotificationPatient;
  item?: NotificationItem;
}

/**
 * Notification with computed properties
 */
export interface EnhancedNotification extends Notification {
  daysUntilDue: number;
  priority: NotificationPriority;
  status: NotificationStatus;
  formattedDueDate: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
}

/**
 * Notification context type for provider
 */
export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
}

/**
 * User notification preferences
 */
export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationWindow: number; // days before due date
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: {
    test: boolean;
    injection: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

// ============================================================================
// Supabase Realtime Types
// ============================================================================

/**
 * Supabase realtime event types
 */
export enum RealtimeEventType {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * Supabase realtime payload
 */
export interface RealtimePayload<T = Notification> {
  eventType: RealtimeEventType;
  new: T | null;
  old: T | null;
  errors: string[] | null;
  commit_timestamp: string;
}

/**
 * Supabase channel subscription
 */
export interface NotificationSubscription {
  channel: string;
  event: string;
  schema: string;
  table: string;
  filter?: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * API response for fetching notifications
 */
export interface NotificationListResponse {
  data: Notification[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * API request for updating notification
 */
export interface UpdateNotificationRequest {
  is_notified?: boolean;
  status?: NotificationStatus;
  dismissed_at?: string;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  upcoming: number;
  overdue: number;
  byType: {
    test: number;
    injection: number;
  };
  byPriority: Record<NotificationPriority, number>;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const NotificationPatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  patient_number: z.string().min(1).max(50),
});

export const NotificationItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(['test', 'injection']),
  period_value: z.number().int().positive(),
  period_unit: z.enum(['weeks', 'months']),
});

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  item_id: z.string().uuid(),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_notified: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  patient: NotificationPatientSchema.optional(),
  item: NotificationItemSchema.optional(),
});

export const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean(),
  notificationWindow: z.number().int().min(1).max(30),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  notificationTypes: z.object({
    test: z.boolean(),
    injection: z.boolean(),
  }),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
  }),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isNotification(value: unknown): value is Notification {
  return NotificationSchema.safeParse(value).success;
}

export function isNotificationArray(value: unknown): value is Notification[] {
  return z.array(NotificationSchema).safeParse(value).success;
}

// ============================================================================
// Utility Types
// ============================================================================

export type NotificationId = string;
export type PatientId = string;
export type ItemId = string;

export type NotificationFilter = {
  patientId?: PatientId;
  itemType?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  dateRange?: {
    start: Date;
    end: Date;
  };
  isOverdue?: boolean;
  isUnread?: boolean;
};

export type NotificationSortField = 'dueDate' | 'priority' | 'patientName' | 'createdAt';
export type NotificationSortOrder = 'asc' | 'desc';

export interface NotificationSort {
  field: NotificationSortField;
  order: NotificationSortOrder;
}