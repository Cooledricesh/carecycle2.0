'use client';

import { useEffect, useState } from 'react';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Switch } from '@heroui/switch';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';
import { Chip } from '@heroui/chip';
import { Skeleton } from '@heroui/skeleton';
import { Divider } from '@heroui/divider';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Schedule {
  scheduleId: string;
  scheduledDate: string;
  patient: {
    id: string;
    name: string;
    patientNumber: string;
  };
  item: {
    id: string;
    name: string;
    type: string;
  };
  isCompleted?: boolean;
  notes?: string;
  actualCompletionDate?: string;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [completionDates, setCompletionDates] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    fetchTodaySchedules();
  }, []);

  const fetchTodaySchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/schedule/today');
      
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      
      const data = await response.json();
      setSchedules(data);
      
      // Initialize states for each schedule
      const initialChecked: Record<string, boolean> = {};
      const initialNotes: Record<string, string> = {};
      const initialDates: Record<string, string> = {};
      
      data.forEach((schedule: Schedule) => {
        initialChecked[schedule.scheduleId] = false;
        initialNotes[schedule.scheduleId] = '';
        initialDates[schedule.scheduleId] = format(new Date(), 'yyyy-MM-dd');
      });
      
      setCheckedItems(initialChecked);
      setNotes(initialNotes);
      setCompletionDates(initialDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = async (scheduleId: string, isChecked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [scheduleId]: isChecked }));
  };

  const handleNotesChange = (scheduleId: string, value: string) => {
    setNotes(prev => ({ ...prev, [scheduleId]: value }));
  };

  const handleDateChange = (scheduleId: string, value: string) => {
    setCompletionDates(prev => ({ ...prev, [scheduleId]: value }));
  };

  const handleSaveAll = async () => {
    try {
      const updates = schedules
        .filter(schedule => checkedItems[schedule.scheduleId])
        .map(schedule => 
          fetch('/api/schedule/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scheduleId: schedule.scheduleId,
              isCompleted: true,
              notes: notes[schedule.scheduleId] || null,
              actualCompletionDate: completionDates[schedule.scheduleId] || null,
            }),
          })
        );

      const results = await Promise.all(updates);
      
      const allSuccessful = results.every(res => res.ok);
      
      if (allSuccessful) {
        alert('저장되었습니다.');
        // Refresh the schedules
        await fetchTodaySchedules();
      } else {
        alert('일부 항목 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error saving schedules:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardBody className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">일정을 불러올 수 없습니다</h2>
            <p className="text-default-500 mb-6">오류: {error}</p>
            <Button color="primary" onClick={() => window.location.reload()}>다시 시도</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">일정 목록</h2>
                <p className="text-sm text-slate-600">
                  {schedules.length > 0 ? `총 ${schedules.length}개의 일정이 있습니다` : '오늘 예정된 일정이 없습니다'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Chip 
                  color="primary" 
                  variant="flat"
                  startContent={<Calendar className="w-4 h-4" />}
                >
                  {schedules.length}개 일정
                </Chip>
              </div>
            </CardHeader>

            <CardBody>
              {schedules.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium mb-2">오늘 예정된 일정이 없습니다</h3>
                  <p className="text-sm">모든 일정을 완료했거나 오늘은 예정된 검사·주사가 없습니다.</p>
                </div>
              ) : (
                <>
                  <Table 
                    aria-label="오늘의 일정 테이블"
                    classNames={{
                      wrapper: "min-h-[400px]",
                    }}
                  >
                    <TableHeader>
                      <TableColumn>시행 여부</TableColumn>
                      <TableColumn>환자 정보</TableColumn>
                      <TableColumn>검사·주사 항목</TableColumn>
                      <TableColumn>메모</TableColumn>
                      <TableColumn>실제 시행일</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule, index) => (
                        <TableRow 
                          key={schedule.scheduleId}
                          className={`${checkedItems[schedule.scheduleId] ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-slate-50'} transition-colors duration-200`}
                        >
                          <TableCell>
                            <Switch
                              isSelected={checkedItems[schedule.scheduleId]}
                              onValueChange={(isChecked) => handleCheckChange(schedule.scheduleId, isChecked)}
                              color="success"
                              size="sm"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">
                                {schedule.patient.name}
                              </span>
                              <span className="text-xs text-slate-500">
                                {schedule.patient.patientNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-slate-800">
                                {schedule.item.name}
                              </span>
                              <Chip 
                                size="sm" 
                                color={schedule.item.type === 'test' ? 'primary' : 'secondary'}
                                variant="flat"
                              >
                                {schedule.item.type === 'test' ? '검사' : '주사'}
                              </Chip>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              size="sm"
                              placeholder="메모 입력"
                              value={notes[schedule.scheduleId] || ''}
                              onChange={(e) => handleNotesChange(schedule.scheduleId, e.target.value)}
                              isDisabled={!checkedItems[schedule.scheduleId]}
                              variant="bordered"
                              className="max-w-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              size="sm"
                              value={completionDates[schedule.scheduleId] || ''}
                              onChange={(e) => handleDateChange(schedule.scheduleId, e.target.value)}
                              isDisabled={!checkedItems[schedule.scheduleId]}
                              variant="bordered"
                              className="max-w-xs"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Divider className="my-4" />

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {Object.values(checkedItems).filter(Boolean).length}개 항목이 선택됨
                      </span>
                    </div>
                    <Button 
                      color="primary"
                      size="lg"
                      onClick={handleSaveAll}
                      isDisabled={!Object.values(checkedItems).some(Boolean)}
                      startContent={<CheckCircle className="w-4 h-4" />}
                    >
                      선택된 항목 저장
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}