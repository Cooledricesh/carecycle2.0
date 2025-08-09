'use client';

import { motion } from 'framer-motion';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Users, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <motion.div 
      className="mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">빠른 작업</h3>
            <p className="text-sm text-slate-600">자주 사용하는 기능에 빠르게 접근하세요</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Link href="/patients/register">
              <Button 
                color="primary" 
                size="lg"
                startContent={<Users className="w-4 h-4" />}
                className="font-medium"
              >
                새 환자 등록
              </Button>
            </Link>
            <Link href="/schedule">
              <Button 
                color="success"
                variant="flat" 
                size="lg"
                startContent={<Calendar className="w-4 h-4" />}
                className="font-medium"
              >
                오늘 일정 확인
              </Button>
            </Link>
            <Link href="/schedule">
              <Button 
                color="warning"
                variant="flat" 
                size="lg"
                startContent={<AlertCircle className="w-4 h-4" />}
                className="font-medium"
              >
                연체 항목 관리
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}