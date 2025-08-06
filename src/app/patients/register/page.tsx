'use client';

import { PatientRegistrationForm } from '@/components/patient-registration-form';

export default function PatientRegisterPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-center">
        <PatientRegistrationForm />
      </div>
    </div>
  );
}