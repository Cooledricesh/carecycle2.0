'use client';

import { useEffect, useState } from 'react';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Switch } from '@heroui/switch';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">일정을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">오류: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">오늘의 검사/주사 일정</h1>
      
      {schedules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          오늘 예정된 일정이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시행 여부
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  환자 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  항목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  메모
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  실제 시행일
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.scheduleId} className={checkedItems[schedule.scheduleId] ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Switch
                      isSelected={checkedItems[schedule.scheduleId]}
                      onValueChange={(isChecked) => handleCheckChange(schedule.scheduleId, isChecked)}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.patient.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {schedule.patient.patientNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {schedule.item.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {schedule.item.type === 'test' ? '검사' : '주사'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Input
                      type="text"
                      size="sm"
                      placeholder="메모 입력"
                      value={notes[schedule.scheduleId]}
                      onChange={(e) => handleNotesChange(schedule.scheduleId, e.target.value)}
                      isDisabled={!checkedItems[schedule.scheduleId]}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Input
                      type="date"
                      size="sm"
                      value={completionDates[schedule.scheduleId]}
                      onChange={(e) => handleDateChange(schedule.scheduleId, e.target.value)}
                      isDisabled={!checkedItems[schedule.scheduleId]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-6 flex justify-end">
        <Button 
          color="primary"
          onClick={handleSaveAll}
        >
          저장
        </Button>
      </div>
    </div>
  );
}