'use client';

import { PatientRegistrationForm } from '@/components/patient-registration-form';
import { motion } from 'framer-motion';

export default function PatientRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <PatientRegistrationForm />
        </motion.div>
      </div>
    </div>
  );
}