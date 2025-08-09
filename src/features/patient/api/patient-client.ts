/**
 * Patient API Client Layer
 * Centralized fetch logic for patient data with TanStack Query integration
 */

import { 
  Patient,
  PatientWithSchedules,
  PatientRegistrationRequest,
  PatientRegistrationResponse,
  PatientsListResponse,
  patientQueryKeys
} from '@/features/patient/types';

import { 
  createApiClientError, 
  parseApiError, 
  handleNetworkError,
  logError 
} from '@/lib/api-client-errors';

import type { ApiClientError } from '@/types/api/common';

/**
 * Generic fetch wrapper with centralized error handling
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      let errorData;
      
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }
      
      const error = parseApiError(response, errorData);
      logError(error, { endpoint });
      throw error;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // If it's already our custom error, just re-throw
    if (error instanceof Error && error.name === 'ApiClientError') {
      throw error;
    }
    
    // Handle network and other errors
    const networkError = handleNetworkError(error);
    logError(networkError, { endpoint });
    throw networkError;
  }
}

/**
 * Patient API Client
 */
export const patientClient = {
  /**
   * Register a new patient with schedules
   */
  async registerPatient(patientData: PatientRegistrationRequest): Promise<PatientRegistrationResponse> {
    const response = await apiRequest<PatientRegistrationResponse>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
    return response;
  },

  /**
   * Get all patients with their schedules
   */
  async getPatients(): Promise<PatientWithSchedules[]> {
    const response = await apiRequest<PatientWithSchedules[]>('/api/patients');
    return response;
  },

  /**
   * Get a specific patient by ID
   * Note: This endpoint doesn't exist yet but would be useful for patient details
   */
  async getPatient(patientId: string): Promise<PatientWithSchedules> {
    const response = await apiRequest<PatientWithSchedules>(`/api/patients/${patientId}`);
    return response;
  },

  /**
   * Update patient information
   * Note: This endpoint doesn't exist yet but would be useful for editing patients
   */
  async updatePatient(patientId: string, updates: Partial<Pick<Patient, 'name'>>): Promise<Patient> {
    const response = await apiRequest<Patient>(`/api/patients/${patientId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response;
  },

  /**
   * Deactivate a patient
   * Note: This endpoint doesn't exist yet but would be useful for soft deletion
   */
  async deactivatePatient(patientId: string): Promise<{ success: boolean }> {
    const response = await apiRequest<{ success: boolean }>(`/api/patients/${patientId}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Search patients by name or patient number
   * Note: This endpoint doesn't exist yet but would be useful for search functionality
   */
  async searchPatients(query: string): Promise<PatientWithSchedules[]> {
    const response = await apiRequest<PatientWithSchedules[]>(`/api/patients/search?q=${encodeURIComponent(query)}`);
    return response;
  },

  /**
   * Get available items for schedule creation
   * Note: This endpoint doesn't exist yet but would be useful for form options
   */
  async getAvailableItems(): Promise<{
    id: string;
    name: string;
    type: 'test' | 'injection';
    periodValue: number;
    periodUnit: 'days' | 'weeks' | 'months' | 'years';
  }[]> {
    const response = await apiRequest<{
      id: string;
      name: string;
      type: 'test' | 'injection';
      periodValue: number;
      periodUnit: 'days' | 'weeks' | 'months' | 'years';
    }[]>('/api/patients/items');
    return response;
  },

  /**
   * Get patient statistics
   * Note: This endpoint doesn't exist yet but would be useful for analytics
   */
  async getPatientStats(): Promise<{
    totalPatients: number;
    activeSchedules: number;
    recentRegistrations: number;
  }> {
    const response = await apiRequest<{
      totalPatients: number;
      activeSchedules: number;
      recentRegistrations: number;
    }>('/api/patients/stats');
    return response;
  }
};

/**
 * Export query keys for consistency
 */
export { patientQueryKeys };