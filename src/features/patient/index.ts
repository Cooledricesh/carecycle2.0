/**
 * Patient Feature Module
 * Clean architecture implementation for patient management
 */

// Types
export type {
  Patient,
  PatientWithSchedules,
  PatientSchedule,
  ScheduleItem,
  PatientRegistrationData,
  PatientScheduleInput,
  PatientRegistrationRequest,
  PatientRegistrationResponse,
  PatientsListResponse,
  PatientErrorResponse,
  PatientServiceDeps,
  PeriodUnit,
  ItemType,
  PatientQueryKeys
} from './types';

export {
  PatientScheduleInputSchema,
  PatientRegistrationRequestSchema,
  PatientSchema,
  ScheduleItemSchema,
  PatientScheduleSchema,
  PatientWithSchedulesSchema,
  PatientsListResponseSchema,
  patientQueryKeys,
  PERIOD_UNITS,
  ITEM_TYPES
} from './types';

// API Client
export { patientClient } from './api/patient-client';

// React Query Hooks
export {
  usePatients,
  usePatient,
  useRegisterPatient,
  useUpdatePatient,
  useDeactivatePatient,
  useSearchPatients,
  useAvailableItems,
  usePatientStats,
  usePrefetchPatientData
} from './hooks/use-patient-data';

// Components
export { PatientRegistrationForm } from './components/PatientRegistrationForm';

// Services (for direct use in API routes)
export { PatientService, createPatientService } from '@/services/patient.service';