/**
 * Patient Data Hooks
 * React Query hooks for patient data management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { patientClient, patientQueryKeys } from '@/features/patient/api/patient-client';
import type { 
  Patient,
  PatientWithSchedules,
  PatientRegistrationRequest,
  PatientRegistrationResponse
} from '@/features/patient/types';

/**
 * Hook to fetch all patients
 */
export function usePatients() {
  return useQuery({
    queryKey: patientQueryKeys.list(),
    queryFn: () => patientClient.getPatients(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (4xx)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to fetch a specific patient by ID
 */
export function usePatient(patientId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: patientQueryKeys.detail(patientId),
    queryFn: () => patientClient.getPatient(patientId),
    enabled: enabled && Boolean(patientId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to register a new patient
 */
export function useRegisterPatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientData: PatientRegistrationRequest) => 
      patientClient.registerPatient(patientData),
    
    onSuccess: (data: PatientRegistrationResponse, variables: PatientRegistrationRequest) => {
      // Invalidate and refetch patients list
      queryClient.invalidateQueries({ queryKey: patientQueryKeys.list() });
      
      // Also invalidate dashboard data as it depends on patient count
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Show success message
      toast({
        title: 'Patient Registered',
        description: `Patient "${variables.name}" has been successfully registered with ${variables.schedules.length} schedule(s).`,
      });
    },
    
    onError: (error: any) => {
      console.error('Failed to register patient:', error);
      
      // Show appropriate error message
      let errorMessage = 'Failed to register patient. Please try again.';
      
      if (error?.message?.includes('already exists')) {
        errorMessage = 'A patient with this number already exists.';
      } else if (error?.message?.includes('invalid')) {
        errorMessage = 'One or more selected items are invalid.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update patient information
 */
export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, updates }: { patientId: string; updates: Partial<Pick<Patient, 'name'>> }) => 
      patientClient.updatePatient(patientId, updates),
    
    onSuccess: (data: Patient, variables) => {
      // Update the patient in cache
      queryClient.setQueryData(
        patientQueryKeys.detail(variables.patientId),
        (old: PatientWithSchedules | undefined) => 
          old ? { ...old, name: data.name, updatedAt: data.updatedAt } : undefined
      );
      
      // Invalidate patients list to show updated data
      queryClient.invalidateQueries({ queryKey: patientQueryKeys.list() });
      
      toast({
        title: 'Patient Updated',
        description: 'Patient information has been updated successfully.',
      });
    },
    
    onError: (error: any) => {
      console.error('Failed to update patient:', error);
      
      toast({
        title: 'Update Failed',
        description: error?.message || 'Failed to update patient information. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to deactivate a patient
 */
export function useDeactivatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => patientClient.deactivatePatient(patientId),
    
    onSuccess: (data, variables) => {
      // Remove patient from cache
      queryClient.removeQueries({ queryKey: patientQueryKeys.detail(variables) });
      
      // Invalidate patients list
      queryClient.invalidateQueries({ queryKey: patientQueryKeys.list() });
      
      // Also invalidate dashboard data
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      toast({
        title: 'Patient Deactivated',
        description: 'Patient has been deactivated successfully.',
      });
    },
    
    onError: (error: any) => {
      console.error('Failed to deactivate patient:', error);
      
      toast({
        title: 'Deactivation Failed',
        description: error?.message || 'Failed to deactivate patient. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to search patients
 */
export function useSearchPatients(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...patientQueryKeys.all, 'search', query],
    queryFn: () => patientClient.searchPatients(query),
    enabled: enabled && Boolean(query?.trim()) && query.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to get available items for registration
 */
export function useAvailableItems() {
  return useQuery({
    queryKey: [...patientQueryKeys.all, 'items'],
    queryFn: () => patientClient.getAvailableItems(),
    staleTime: 30 * 60 * 1000, // 30 minutes - items don't change often
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to get patient statistics
 */
export function usePatientStats() {
  return useQuery({
    queryKey: [...patientQueryKeys.all, 'stats'],
    queryFn: () => patientClient.getPatientStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook to prefetch patient data
 * Useful for optimistic loading
 */
export function usePrefetchPatientData() {
  const queryClient = useQueryClient();

  const prefetchPatients = () => {
    queryClient.prefetchQuery({
      queryKey: patientQueryKeys.list(),
      queryFn: () => patientClient.getPatients(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchPatient = (patientId: string) => {
    queryClient.prefetchQuery({
      queryKey: patientQueryKeys.detail(patientId),
      queryFn: () => patientClient.getPatient(patientId),
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchAvailableItems = () => {
    queryClient.prefetchQuery({
      queryKey: [...patientQueryKeys.all, 'items'],
      queryFn: () => patientClient.getAvailableItems(),
      staleTime: 30 * 60 * 1000,
    });
  };

  return {
    prefetchPatients,
    prefetchPatient,
    prefetchAvailableItems,
  };
}