/**
 * ScheduleList Component
 * Displays today's schedules with completion tracking
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, AlertTriangle, User, Calendar } from 'lucide-react';
import { useTodaySchedules, useUpdateSchedule } from '@/features/schedule/hooks/use-schedule-data';
import type { Schedule } from '@/features/schedule/types';

interface ScheduleItemProps {
  schedule: Schedule;
  onUpdate: (scheduleId: string, isCompleted: boolean, notes?: string, actualDate?: string) => void;
  isUpdating: boolean;
}

function ScheduleItem({ schedule, onUpdate, isUpdating }: ScheduleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [actualDate, setActualDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleComplete = () => {
    onUpdate(schedule.scheduleId, true, notes || undefined, actualDate);
    setIsExpanded(false);
    setNotes('');
  };

  const handleSkip = () => {
    onUpdate(schedule.scheduleId, false, notes || 'Skipped', actualDate);
    setIsExpanded(false);
    setNotes('');
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'test':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'injection':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              {schedule.patient.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span>Patient #{schedule.patient.patientNumber}</span>
              <Calendar className="h-4 w-4" />
              <span>{schedule.scheduledDate}</span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getItemTypeColor(schedule.item.type)}>
              {schedule.item.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm font-medium">
            {schedule.item.name}
          </div>
          
          {!isExpanded ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setIsExpanded(true)}
                disabled={isUpdating}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                disabled={isUpdating}
              >
                Skip
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="actualDate">Completion Date</Label>
                <Input
                  id="actualDate"
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this schedule..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleComplete}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Updating...' : 'Complete'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsExpanded(false);
                    setNotes('');
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ScheduleList() {
  const { data: schedules = [], isLoading, error, refetch } = useTodaySchedules();
  const updateScheduleMutation = useUpdateSchedule();

  const handleUpdateSchedule = (
    scheduleId: string, 
    isCompleted: boolean, 
    notes?: string, 
    actualCompletionDate?: string
  ) => {
    updateScheduleMutation.mutate({
      scheduleId,
      isCompleted,
      notes,
      actualCompletionDate,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Today&apos;s Schedule</h2>
          <Clock className="h-5 w-5 animate-spin" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Today&apos;s Schedule</h2>
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-red-700">
                  Failed to Load Schedules
                </h3>
                <p className="text-red-600 mt-2">
                  {error?.message || 'An unexpected error occurred'}
                </p>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Today&apos;s Schedule</h2>
        <Badge variant="outline" className="px-3 py-1">
          {schedules.length} item{schedules.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">All Done!</h3>
                <p className="text-gray-600 mt-2">
                  No schedules for today. Great job staying on top of everything!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <ScheduleItem
              key={schedule.scheduleId}
              schedule={schedule}
              onUpdate={handleUpdateSchedule}
              isUpdating={updateScheduleMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}