/**
 * Patient Feature Types
 * Type definitions for the Patient feature module
 */

import { z } from 'zod';

// Core Patient entities
export interface Patient {
  id: string;
  patientNumber: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PatientWithSchedules extends Patient {
  patientSchedules: PatientSchedule[];
}

export interface PatientSchedule {
  id: string;
  patientId: string;
  itemId: string;
  firstDate: string;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
  item: ScheduleItem;
}

export interface ScheduleItem {
  id: string;
  name: string;
  type: 'test' | 'injection';
  periodValue: number;
  periodUnit: 'days' | 'weeks' | 'months' | 'years';
}

// Patient Registration types
export interface PatientRegistrationData {
  patientNumber: string;
  name: string;
  schedules: PatientScheduleInput[];
}

export interface PatientScheduleInput {
  itemId: string;
  firstDate: string;
  periodValue: number;
  periodUnit: 'days' | 'weeks' | 'months' | 'years';
}

// API Request/Response types
export interface PatientRegistrationRequest extends PatientRegistrationData {}

export interface PatientRegistrationResponse {
  success: boolean;
  patient?: Patient;
  message?: string;
}

export interface PatientsListResponse {
  patients: PatientWithSchedules[];
}

export interface PatientErrorResponse {
  error: string;
  message?: string;
  details?: any;
}

// Zod schemas for validation
export const PatientScheduleInputSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  firstDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  periodValue: z.number().min(1, 'Period value must be at least 1'),
  periodUnit: z.enum(['days', 'weeks', 'months', 'years']),
});

export const PatientRegistrationRequestSchema = z.object({
  patientNumber: z.string().min(1, 'Patient number is required'),
  name: z.string().min(1, 'Patient name is required'),
  schedules: z.array(PatientScheduleInputSchema).min(1, 'At least one schedule is required'),
});

export const PatientSchema = z.object({
  id: z.string(),
  patientNumber: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const ScheduleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['test', 'injection']),
  periodValue: z.number(),
  periodUnit: z.enum(['days', 'weeks', 'months', 'years']),
});

export const PatientScheduleSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  itemId: z.string(),
  firstDate: z.string(),
  nextDueDate: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  item: ScheduleItemSchema,
});

export const PatientWithSchedulesSchema = z.object({
  id: z.string(),
  patientNumber: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  patientSchedules: z.array(PatientScheduleSchema),
});

export const PatientsListResponseSchema = z.object({
  patients: z.array(PatientWithSchedulesSchema),
});

// Service layer types
export interface PatientServiceDeps {
  supabase: any; // SupabaseClient type
}

// Utility types
export type PeriodUnit = 'days' | 'weeks' | 'months' | 'years';
export type ItemType = 'test' | 'injection';

// Query keys for React Query
export const patientQueryKeys = {
  all: ['patient'] as const,
  list: () => [...patientQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...patientQueryKeys.all, 'detail', id] as const,
  schedules: (patientId: string) => [...patientQueryKeys.all, 'schedules', patientId] as const,
} as const;

export type PatientQueryKeys = typeof patientQueryKeys;

// Form validation helpers
export const PERIOD_UNITS: { value: PeriodUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'test', label: 'Test' },
  { value: 'injection', label: 'Injection' },
];