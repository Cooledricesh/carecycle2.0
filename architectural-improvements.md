# CareCycle 2.0 - Architecture Improvement Plan

## Executive Summary

This document outlines a comprehensive plan to transform the current CareCycle 2.0 codebase from a traditional Next.js application to a clean, maintainable, and scalable architecture following Domain-Driven Design (DDD) and Clean Architecture principles.

## Current Architecture Issues

### 1. Tight Coupling
- Business logic embedded in API routes
- UI components directly accessing external services
- No clear separation of concerns

### 2. Poor Testability
- 8% test coverage indicates architectural problems
- Difficult to mock dependencies
- No clear boundaries for unit testing

### 3. Inconsistent Patterns
- Mixed error handling approaches
- Scattered data access logic
- No standardized service interfaces

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Pages     │  │ Components  │  │   Hooks     │     │
│  │  (Next.js)  │  │   (React)   │  │ (Custom)    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Services  │  │   Use Cases │  │   DTOs      │     │
│  │             │  │             │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Domain Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Entities  │  │  Value Objs │  │   Services  │     │
│  │             │  │             │  │   (Domain)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Repositories│  │   Database  │  │   External  │     │
│  │             │  │  (Supabase) │  │   Services  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Domain Layer (Week 1-2)
1. Create domain entities and value objects
2. Define domain services and business rules
3. Establish domain events

### Phase 2: Application Layer (Week 3-4)
1. Implement use cases
2. Create application services
3. Define DTOs and interfaces

### Phase 3: Infrastructure Layer (Week 5-6)
1. Build repository implementations
2. Create database adapters
3. Implement external service clients

### Phase 4: Presentation Layer Refactoring (Week 7-8)
1. Refactor API routes to use use cases
2. Update React components to use application services
3. Implement proper error boundaries

### Phase 5: Testing & Documentation (Week 9-10)
1. Add comprehensive unit tests
2. Integration tests for use cases
3. E2E tests for critical user journeys
4. Update documentation

## Expected Benefits

1. **Improved Testability**: Target 90%+ test coverage
2. **Better Maintainability**: Clear separation of concerns
3. **Enhanced Scalability**: Easy to add new features
4. **Reduced Coupling**: Independent layers
5. **Better Error Handling**: Consistent error patterns

## Directory Structure

```
src/
├── app/                    # Next.js App Router (Presentation)
│   ├── api/               # API routes (thin controllers)
│   └── (pages)/           # Page components
├── components/            # React components (Presentation)
├── hooks/                 # Custom hooks (Presentation)
├── application/           # Application layer
│   ├── services/          # Application services
│   ├── use-cases/         # Use case implementations
│   └── dtos/              # Data transfer objects
├── domain/                # Domain layer
│   ├── entities/          # Domain entities
│   ├── value-objects/     # Value objects
│   ├── services/          # Domain services
│   └── events/            # Domain events
├── infrastructure/        # Infrastructure layer
│   ├── repositories/      # Repository implementations
│   ├── database/          # Database adapters
│   └── external/          # External service clients
└── shared/                # Shared utilities
    ├── types/             # Shared types
    ├── constants/         # Application constants
    └── utils/             # Utility functions
```

## Detailed Implementation Examples

### 1. Domain Entity Example

```typescript
// src/domain/entities/patient.entity.ts
import { PatientNumber } from '../value-objects/patient-number.vo';
import { PatientName } from '../value-objects/patient-name.vo';
import { DomainEntity } from '../base/domain-entity.base';

export class Patient extends DomainEntity {
  private constructor(
    id: string,
    private readonly _patientNumber: PatientNumber,
    private _name: PatientName,
    private _isActive: boolean = true,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  static create(
    patientNumber: string,
    name: string
  ): Patient {
    return new Patient(
      crypto.randomUUID(),
      PatientNumber.create(patientNumber),
      PatientName.create(name)
    );
  }

  static restore(
    id: string,
    patientNumber: string,
    name: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date
  ): Patient {
    return new Patient(
      id,
      PatientNumber.create(patientNumber),
      PatientName.create(name),
      isActive,
      createdAt,
      updatedAt
    );
  }

  // Getters
  get patientNumber(): string {
    return this._patientNumber.value;
  }

  get name(): string {
    return this._name.value;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // Business methods
  updateName(newName: string): void {
    this._name = PatientName.create(newName);
    this.markAsUpdated();
  }

  deactivate(): void {
    if (!this._isActive) {
      throw new Error('Patient is already inactive');
    }
    this._isActive = false;
    this.markAsUpdated();
  }

  activate(): void {
    if (this._isActive) {
      throw new Error('Patient is already active');
    }
    this._isActive = true;
    this.markAsUpdated();
  }
}
```

### 2. Use Case Example

```typescript
// src/application/use-cases/register-patient.use-case.ts
import { Patient } from '@/domain/entities/patient.entity';
import { PatientRepository } from '@/domain/repositories/patient.repository';
import { ScheduleService } from '@/domain/services/schedule.service';
import { RegisterPatientDto } from '@/application/dtos/register-patient.dto';

export interface RegisterPatientUseCase {
  execute(dto: RegisterPatientDto): Promise<Patient>;
}

export class RegisterPatientUseCaseImpl implements RegisterPatientUseCase {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly scheduleService: ScheduleService
  ) {}

  async execute(dto: RegisterPatientDto): Promise<Patient> {
    // 1. Check if patient already exists
    const existingPatient = await this.patientRepository.findByPatientNumber(
      dto.patientNumber
    );
    
    if (existingPatient) {
      throw new Error('Patient with this number already exists');
    }

    // 2. Create patient entity
    const patient = Patient.create(dto.patientNumber, dto.name);

    // 3. Save patient
    await this.patientRepository.save(patient);

    // 4. Create schedules using domain service
    await this.scheduleService.createSchedulesForPatient(
      patient.id,
      dto.schedules
    );

    return patient;
  }
}
```

### 3. Repository Interface & Implementation

```typescript
// src/domain/repositories/patient.repository.ts (Interface)
import { Patient } from '@/domain/entities/patient.entity';

export interface PatientRepository {
  save(patient: Patient): Promise<void>;
  findById(id: string): Promise<Patient | null>;
  findByPatientNumber(patientNumber: string): Promise<Patient | null>;
  findAll(): Promise<Patient[]>;
  delete(id: string): Promise<void>;
}

// src/infrastructure/repositories/supabase-patient.repository.ts (Implementation)
import { PatientRepository } from '@/domain/repositories/patient.repository';
import { Patient } from '@/domain/entities/patient.entity';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabasePatientRepository implements PatientRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(patient: Patient): Promise<void> {
    const { error } = await this.supabase
      .from('patients')
      .upsert({
        id: patient.id,
        patient_number: patient.patientNumber,
        name: patient.name,
        is_active: patient.isActive,
        created_at: patient.createdAt,
        updated_at: patient.updatedAt,
      });

    if (error) {
      throw new Error(`Failed to save patient: ${error.message}`);
    }
  }

  async findById(id: string): Promise<Patient | null> {
    const { data, error } = await this.supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to find patient: ${error.message}`);
    }

    return Patient.restore(
      data.id,
      data.patient_number,
      data.name,
      data.is_active,
      new Date(data.created_at),
      new Date(data.updated_at)
    );
  }

  // ... other methods
}
```

### 4. Clean API Route

```typescript
// src/app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RegisterPatientUseCaseImpl } from '@/application/use-cases/register-patient.use-case';
import { SupabasePatientRepository } from '@/infrastructure/repositories/supabase-patient.repository';
import { ScheduleServiceImpl } from '@/domain/services/schedule.service';
import { createClient } from '@/lib/supabase/server';
import { RegisterPatientDto } from '@/application/dtos/register-patient.dto';
import { ApiErrorHandler } from '@/infrastructure/error-handling/api-error-handler';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const dto = RegisterPatientDto.fromJson(body);

    // 2. Setup dependencies
    const supabase = await createClient();
    const patientRepository = new SupabasePatientRepository(supabase);
    const scheduleService = new ScheduleServiceImpl();
    const useCase = new RegisterPatientUseCaseImpl(
      patientRepository,
      scheduleService
    );

    // 3. Execute use case
    const patient = await useCase.execute(dto);

    // 4. Return response
    return NextResponse.json(
      { 
        id: patient.id,
        patientNumber: patient.patientNumber,
        name: patient.name 
      },
      { status: 201 }
    );
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
```

### 5. React Component with Clean Dependencies

```typescript
// src/components/patient-registration-form.tsx
'use client';

import { usePatientRegistration } from '@/hooks/use-patient-registration';
import { RegisterPatientDto } from '@/application/dtos/register-patient.dto';

export function PatientRegistrationForm() {
  const {
    registerPatient,
    isLoading,
    error,
    items,
    isLoadingItems
  } = usePatientRegistration();

  const onSubmit = async (formData: FormData) => {
    try {
      const dto = RegisterPatientDto.fromFormData(formData);
      await registerPatient(dto);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  // ... rest of component logic (UI only)
}
```

### 6. Custom Hook with Application Service

```typescript
// src/hooks/use-patient-registration.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { PatientApplicationService } from '@/application/services/patient.service';
import { ItemApplicationService } from '@/application/services/item.service';

export function usePatientRegistration() {
  const patientService = PatientApplicationService.getInstance();
  const itemService = ItemApplicationService.getInstance();

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemService.getAllItems(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const registerPatientMutation = useMutation({
    mutationFn: (dto: RegisterPatientDto) => patientService.registerPatient(dto),
    onSuccess: () => {
      // Handle success (e.g., show toast, redirect)
    },
    onError: (error) => {
      // Handle error (e.g., show error toast)
      console.error('Registration failed:', error);
    },
  });

  return {
    registerPatient: registerPatientMutation.mutateAsync,
    isLoading: registerPatientMutation.isPending,
    error: registerPatientMutation.error,
    items,
    isLoadingItems,
  };
}
```

## Migration Strategy

### Step 1: Create Foundation (Week 1)
1. Set up new directory structure
2. Create base domain classes
3. Define interfaces and contracts

### Step 2: Extract Domain Logic (Week 2)
1. Move business rules to domain entities
2. Create value objects for validation
3. Define domain services

### Step 3: Build Application Layer (Week 3-4)
1. Implement use cases
2. Create application services
3. Define DTOs

### Step 4: Infrastructure Implementation (Week 5-6)
1. Build repository implementations
2. Create database mappers
3. Implement external service clients

### Step 5: Refactor Presentation (Week 7-8)
1. Update API routes to use use cases
2. Refactor React components
3. Update custom hooks

### Step 6: Testing & Quality Assurance (Week 9-10)
1. Add comprehensive test suite
2. Set up test infrastructure
3. Performance optimization
4. Documentation updates

## Expected Outcomes

After implementing this architecture:

1. **Test Coverage**: Increase from 8% to 90%+
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Easy feature additions
4. **Code Quality**: Consistent patterns throughout
5. **Developer Experience**: Better IDE support and debugging
6. **Business Logic**: Centralized and testable business rules

## Conclusion

This architecture transformation will position CareCycle 2.0 as a maintainable, scalable, and testable application. The investment in proper architecture will pay dividends in development speed, code quality, and system reliability.