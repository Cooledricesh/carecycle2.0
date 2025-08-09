/**
 * Schedule Feature Types
 * Type definitions for the Schedule feature module
 */

import { z } from 'zod';

// Core Schedule entities
export interface Schedule {
  scheduleId: string;
  scheduledDate: string;
  patient: {
    id: string;
    name: string;
    patientNumber: string;
  };
  item: {
    id: string;
    name: string;
    type: 'test' | 'injection';
  };
}

export interface ScheduleHistory {
  id: string;
  scheduleId: string;
  scheduledDate: string;
  completedDate: string | null;
  actualCompletionDate: string | null;
  status: 'pending' | 'completed' | 'skipped';
  notes?: string | null;
}

// API Request/Response types
export interface TodaySchedulesResponse {
  schedules: Schedule[];
}

export interface ScheduleUpdateRequest {
  scheduleId: string;
  isCompleted: boolean;
  notes?: string | undefined;
  actualCompletionDate?: string | undefined;
}

export interface ScheduleUpdateResponse {
  success: boolean;
  message?: string;
}

// Error response types
export interface ScheduleErrorResponse {
  error: string;
  message?: string;
}

// Zod schemas for validation
export const ScheduleUpdateRequestSchema = z.object({
  scheduleId: z.string().min(1, 'Schedule ID is required'),
  isCompleted: z.boolean(),
  notes: z.string().optional(),
  actualCompletionDate: z.string().optional(),
});

export const ScheduleSchema = z.object({
  scheduleId: z.string(),
  scheduledDate: z.string(),
  patient: z.object({
    id: z.string(),
    name: z.string(),
    patientNumber: z.string(),
  }),
  item: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['test', 'injection']),
  }),
});

export const TodaySchedulesResponseSchema = z.object({
  schedules: z.array(ScheduleSchema),
});

// Service layer types
export interface ScheduleServiceDeps {
  supabase: any; // SupabaseClient type
}

// Utility types
export type ScheduleStatus = 'pending' | 'completed' | 'skipped';
export type ItemType = 'test' | 'injection';

// Query keys for React Query
export const scheduleQueryKeys = {
  all: ['schedule'] as const,
  today: () => [...scheduleQueryKeys.all, 'today'] as const,
  history: (scheduleId: string) => [...scheduleQueryKeys.all, 'history', scheduleId] as const,
} as const;

export type ScheduleQueryKeys = typeof scheduleQueryKeys;