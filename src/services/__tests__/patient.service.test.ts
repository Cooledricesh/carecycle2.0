/**
 * Patient Service Tests
 * Testing the business logic layer with proper mocking
 */

import { PatientService } from '../patient.service';
import { createMockSupabaseClient } from '@/lib/test-utils';

// Mock the schedule utils
jest.mock('@/lib/schedule-utils', () => ({
  calculateNextDueDate: jest.fn(() => new Date('2025-09-08')),
}));

describe('PatientService', () => {
  let patientService: PatientService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    patientService = new PatientService({ supabase: mockSupabase });
    jest.clearAllMocks();
  });

  describe('registerPatient', () => {
    const mockPatientData = {
      patientNumber: 'P001',
      name: 'John Doe',
      schedules: [
        {
          itemId: 'item1',
          firstDate: '2025-08-08',
          periodValue: 3,
          periodUnit: 'months' as const,
        },
      ],
    };

    it('should register a patient successfully', async () => {
      const mockResult = {
        id: 'patient1',
        patient_number: 'P001',
        name: 'John Doe',
        created_at: '2025-08-08T10:00:00Z',
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockResult,
        error: null,
      });

      const result = await patientService.registerPatient(mockPatientData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('register_patient_with_schedules', {
        p_patient_number: 'P001',
        p_name: 'John Doe',
        p_schedules: [
          {
            item_id: 'item1',
            first_date: '2025-08-08',
            next_due_date: '2025-09-08',
          },
        ],
      });
      expect(result).toBe(mockResult);
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        patientNumber: '',
        name: 'John Doe',
        schedules: [],
      };

      await expect(patientService.registerPatient(invalidData)).rejects.toThrow(
        'Missing required fields: patientNumber, name, and schedules'
      );
    });

    it('should throw error for empty schedules', async () => {
      const invalidData = {
        patientNumber: 'P001',
        name: 'John Doe',
        schedules: [],
      };

      await expect(patientService.registerPatient(invalidData)).rejects.toThrow(
        'At least one schedule is required'
      );
    });

    it('should handle duplicate patient number error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Patient already exists' },
      });

      await expect(patientService.registerPatient(mockPatientData)).rejects.toThrow(
        'Patient with this number already exists'
      );
    });

    it('should handle invalid item error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Invalid item_id provided' },
      });

      await expect(patientService.registerPatient(mockPatientData)).rejects.toThrow(
        'One or more selected items are invalid'
      );
    });
  });

  describe('getAllPatients', () => {
    it('should return all patients with schedules', async () => {
      const mockData = [
        {
          id: 'p1',
          patient_number: 'P001',
          name: 'John Doe',
          created_at: '2025-08-08T10:00:00Z',
          updated_at: null,
          patient_schedules: [
            {
              id: 's1',
              patient_id: 'p1',
              item_id: 'i1',
              first_date: '2025-08-08',
              next_due_date: '2025-09-08',
              is_active: true,
              created_at: '2025-08-08T10:00:00Z',
              items: {
                id: 'i1',
                name: 'Blood Test',
                type: 'test',
                period_value: 3,
                period_unit: 'months',
              },
            },
          ],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      });

      const result = await patientService.getAllPatients();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'p1',
        patientNumber: 'P001',
        name: 'John Doe',
        createdAt: '2025-08-08T10:00:00Z',
        patientSchedules: [
          {
            id: 's1',
            patientId: 'p1',
            itemId: 'i1',
            firstDate: '2025-08-08',
            nextDueDate: '2025-09-08',
            isActive: true,
            item: {
              id: 'i1',
              name: 'Blood Test',
              type: 'test',
              periodValue: 3,
              periodUnit: 'months',
            },
          },
        ],
      });
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      await expect(patientService.getAllPatients()).rejects.toThrow(
        'Failed to fetch patients: Database error'
      );
    });

    it('should handle empty results gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await patientService.getAllPatients();
      expect(result).toEqual([]);
    });
  });

  describe('getPatientById', () => {
    const patientId = 'p1';

    it('should return patient by ID successfully', async () => {
      const mockData = {
        id: 'p1',
        patient_number: 'P001',
        name: 'John Doe',
        created_at: '2025-08-08T10:00:00Z',
        updated_at: null,
        patient_schedules: [],
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await patientService.getPatientById(patientId);

      expect(result).toMatchObject({
        id: 'p1',
        patientNumber: 'P001',
        name: 'John Doe',
      });
    });

    it('should return null for non-existent patient', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const result = await patientService.getPatientById(patientId);
      expect(result).toBeNull();
    });

    it('should throw error for missing patient ID', async () => {
      await expect(patientService.getPatientById('')).rejects.toThrow(
        'Patient ID is required'
      );
    });
  });

  describe('getAvailableItems', () => {
    it('should return available items successfully', async () => {
      const mockData = [
        {
          id: 'i1',
          name: 'Blood Test',
          type: 'test',
          period_value: 3,
          period_unit: 'months',
        },
        {
          id: 'i2',
          name: 'Vaccination',
          type: 'injection',
          period_value: 12,
          period_unit: 'months',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      });

      const result = await patientService.getAvailableItems();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'i1',
        name: 'Blood Test',
        type: 'test',
        periodValue: 3,
        periodUnit: 'months',
      });
    });
  });

  describe('updatePatient', () => {
    const patientId = 'p1';
    const updates = { name: 'Updated Name' };

    it('should update patient successfully', async () => {
      const mockData = {
        id: 'p1',
        patient_number: 'P001',
        name: 'Updated Name',
        created_at: '2025-08-08T10:00:00Z',
        updated_at: '2025-08-08T11:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await patientService.updatePatient(patientId, updates);

      expect(result).toMatchObject({
        id: 'p1',
        name: 'Updated Name',
      });
    });

    it('should throw error for missing patient ID', async () => {
      await expect(patientService.updatePatient('', updates)).rejects.toThrow(
        'Patient ID is required'
      );
    });

    it('should throw error for empty name', async () => {
      await expect(patientService.updatePatient(patientId, { name: '' })).rejects.toThrow(
        'Patient name is required'
      );
    });
  });

  describe('searchPatients', () => {
    it('should search patients successfully', async () => {
      const mockData = [
        {
          id: 'p1',
          patient_number: 'P001',
          name: 'John Doe',
          created_at: '2025-08-08T10:00:00Z',
          updated_at: null,
          patient_schedules: [],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await patientService.searchPatients('John');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should return empty array for empty query', async () => {
      const result = await patientService.searchPatients('');
      expect(result).toEqual([]);
    });
  });

  describe('getPatientStats', () => {
    it('should return patient statistics successfully', async () => {
      // Mock total patients count
      mockSupabase.from
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue({
            count: 50,
            error: null,
          }),
        })
        // Mock active schedules count
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 120,
              error: null,
            }),
          }),
        })
        // Mock recent registrations count
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              count: 5,
              error: null,
            }),
          }),
        });

      const result = await patientService.getPatientStats();

      expect(result).toEqual({
        totalPatients: 50,
        activeSchedules: 120,
        recentRegistrations: 5,
      });
    });
  });
});