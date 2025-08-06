import { addWeeks, addMonths } from 'date-fns';

export type PeriodUnit = 'weeks' | 'months';

export interface SchedulePeriod {
  value: number;
  unit: PeriodUnit;
}

export function calculateNextDueDate(
  baseDate: Date | string,
  period: SchedulePeriod
): Date {
  const date = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  if (period.value <= 0) {
    throw new Error('Period value must be positive');
  }
  
  switch (period.unit) {
    case 'weeks':
      return addWeeks(date, period.value);
    case 'months':
      return addMonths(date, period.value);
    default:
      throw new Error(`Invalid period unit: ${period.unit}`);
  }
}

export function calculateScheduleDates(
  firstDate: Date | string,
  period: SchedulePeriod,
  count: number = 12
): Date[] {
  const dates: Date[] = [];
  let currentDate = typeof firstDate === 'string' ? new Date(firstDate) : firstDate;
  
  for (let i = 0; i < count; i++) {
    currentDate = calculateNextDueDate(currentDate, period);
    dates.push(currentDate);
  }
  
  return dates;
}

export function isOverdue(dueDate: Date | string): boolean {
  const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date < today;
}

export function getDaysUntilDue(dueDate: Date | string): number {
  const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function formatScheduleStatus(daysUntilDue: number): {
  status: 'overdue' | 'today' | 'upcoming' | 'future';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  color: string;
} {
  if (daysUntilDue < 0) {
    return {
      status: 'overdue',
      urgency: 'critical',
      color: 'red'
    };
  } else if (daysUntilDue === 0) {
    return {
      status: 'today',
      urgency: 'high',
      color: 'orange'
    };
  } else if (daysUntilDue <= 7) {
    return {
      status: 'upcoming',
      urgency: 'medium',
      color: 'yellow'
    };
  } else {
    return {
      status: 'future',
      urgency: 'low',
      color: 'green'
    };
  }
}