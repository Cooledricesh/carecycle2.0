/**
 * Patient Data Hooks Tests
 * Testing React Query hooks for patient data management
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients, useRegisterPatient } from '../use-patient-data';
import { patientClient } from '../../api/patient-client';

// Mock the API client
jest.mock('../../api/patient-client', () => ({
  patientClient: {
    getPatients: jest.fn(),
    registerPatient: jest.fn(),
  },
  patientQueryKeys: {
    all: ['patient'],
    list: () => ['patient', 'list'],
  },
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const mockPatientClient = patientClient as jest.Mocked<typeof patientClient>;

describe('Patient Data Hooks', () => {
  let queryClient: QueryClient;
  
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // eslint-disable-next-line react/display-name
    return ({ children }: { children: React.ReactNode }) => {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePatients', () => {
    it('should fetch patients successfully', async () => {
      const mockPatients = [
        {
          id: 'p1',
          patientNumber: 'P001',
          name: 'John Doe',
          createdAt: '2025-08-08T10:00:00Z',
          patientSchedules: [],
        },
      ];

      mockPatientClient.getPatients.mockResolvedValue(mockPatients);

      const { result } = renderHook(() => usePatients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockPatients);
      expect(mockPatientClient.getPatients).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch patients');
      mockPatientClient.getPatients.mockRejectedValue(error);

      const { result } = renderHook(() => usePatients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useRegisterPatient', () => {
    it('should register patient successfully', async () => {
      const mockResponse = {
        success: true,
        patient: {
          id: 'p1',
          patientNumber: 'P001',
          name: 'John Doe',
          createdAt: '2025-08-08T10:00:00Z',
        },
        message: 'Patient registered successfully',
      };

      mockPatientClient.registerPatient.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRegisterPatient(), {
        wrapper: createWrapper(),
      });

      const registrationData = {
        patientNumber: 'P001',
        name: 'John Doe',
        schedules: [
          {
            itemId: 'i1',
            firstDate: '2025-08-08',
            periodValue: 3,
            periodUnit: 'months' as const,
          },
        ],
      };

      result.current.mutate(registrationData);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockPatientClient.registerPatient).toHaveBeenCalledWith(registrationData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle registration errors', async () => {
      const error = new Error('Patient already exists');
      mockPatientClient.registerPatient.mockRejectedValue(error);

      const { result } = renderHook(() => useRegisterPatient(), {
        wrapper: createWrapper(),
      });

      const registrationData = {
        patientNumber: 'P001',
        name: 'John Doe',
        schedules: [
          {
            itemId: 'i1',
            firstDate: '2025-08-08',
            periodValue: 3,
            periodUnit: 'months' as const,
          },
        ],
      };

      result.current.mutate(registrationData);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });
});