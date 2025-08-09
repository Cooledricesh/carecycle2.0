import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPatientService } from '@/services/patient.service';
import { PatientRegistrationRequestSchema } from '@/features/patient/types';
import { handleApiError } from '@/lib/error-handler';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/patients',
    },
    async (span) => {
      try {
        const supabase = await createClient();
        const patientService = createPatientService(supabase);
        
        const body = await request.json();
        span.setAttribute('endpoint', '/api/patients');
        
        // Validate request data
        const validationResult = PatientRegistrationRequestSchema.safeParse(body);
        if (!validationResult.success) {
          return NextResponse.json(
            { 
              error: 'Invalid request data', 
              details: validationResult.error.issues 
            },
            { status: 400 }
          );
        }
        
        const patientData = validationResult.data;
        span.setAttribute('patient.name', patientData.name);
        span.setAttribute('patient.scheduleCount', patientData.schedules.length);
        
        const patient = await patientService.registerPatient(patientData);
        
        return NextResponse.json({ 
          success: true,
          patient,
          message: 'Patient registered successfully'
        }, { status: 201 });
      } catch (error) {
        console.error('Error registering patient:', error);
        Sentry.captureException(error);
        
        return handleApiError(error, {
          defaultMessage: 'Failed to register patient',
          context: 'patient.registerPatient'
        });
      }
    }
  );
}

export async function GET(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/patients',
    },
    async (span) => {
      try {
        const supabase = await createClient();
        const patientService = createPatientService(supabase);
        
        span.setAttribute('endpoint', '/api/patients');
        
        const patients = await patientService.getAllPatients();
        
        span.setAttribute('patients.count', patients.length);
        
        return NextResponse.json(patients);
      } catch (error) {
        console.error('Error fetching patients:', error);
        Sentry.captureException(error);
        
        return handleApiError(error, {
          defaultMessage: 'Failed to fetch patients',
          context: 'patient.getAllPatients'
        });
      }
    }
  );
}