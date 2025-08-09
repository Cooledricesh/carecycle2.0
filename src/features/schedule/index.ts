/**
 * Schedule Feature Module
 * Clean architecture implementation for schedule management
 */

// Types
export type {
  Schedule,
  ScheduleHistory,
  ScheduleUpdateRequest,
  ScheduleUpdateResponse,
  TodaySchedulesResponse,
  ScheduleErrorResponse,
  ScheduleStatus,
  ItemType,
  ScheduleServiceDeps,
  ScheduleQueryKeys
} from './types';

export {
  ScheduleUpdateRequestSchema,
  ScheduleSchema,
  TodaySchedulesResponseSchema,
  scheduleQueryKeys
} from './types';

// API Client
export { scheduleClient } from './api/schedule-client';

// React Query Hooks
export {
  useTodaySchedules,
  useUpdateSchedule,
  useScheduleHistory,
  useOverdueSchedules,
  useUpcomingSchedules,
  useScheduleStats,
  usePrefetchScheduleData
} from './hooks/use-schedule-data';

// Components
export { ScheduleList } from './components/ScheduleList';

// Services (for direct use in API routes)
export { ScheduleService, createScheduleService } from '@/services/schedule.service';