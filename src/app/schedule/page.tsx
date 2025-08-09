'use client';

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { ScheduleList } from '@/features/schedule/components/ScheduleList';

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-3">
            오늘의 검사·주사 일정
          </h1>
          <p className="text-slate-600 text-lg">
            {format(new Date(), 'yyyy년 M월 d일 EEEE', { locale: ko })}의 예정된 일정을 관리하세요
          </p>
        </motion.div>

        {/* Schedule List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ScheduleList />
        </motion.div>
      </div>
    </div>
  );
}