import { calculateNextDueDate, calculateScheduleDates, isOverdue, getDaysUntilDue, formatScheduleStatus } from './schedule-utils';

describe('Schedule Utils', () => {
  describe('calculateNextDueDate', () => {
    it('should calculate next date for weeks', () => {
      const baseDate = new Date('2025-01-01');
      const result = calculateNextDueDate(baseDate, { value: 4, unit: 'weeks' });
      expect(result).toEqual(new Date('2025-01-29'));
    });

    it('should calculate next date for months', () => {
      const baseDate = new Date('2025-01-01');
      const result = calculateNextDueDate(baseDate, { value: 3, unit: 'months' });
      expect(result).toEqual(new Date('2025-04-01'));
    });

    it('should handle leap year correctly', () => {
      const baseDate = new Date('2024-02-29');
      const result = calculateNextDueDate(baseDate, { value: 1, unit: 'months' });
      expect(result).toEqual(new Date('2024-03-29'));
    });

    it('should handle month-end dates correctly', () => {
      const baseDate = new Date('2025-01-31');
      const result = calculateNextDueDate(baseDate, { value: 1, unit: 'months' });
      expect(result).toEqual(new Date('2025-02-28'));
    });

    it('should throw error for invalid date', () => {
      expect(() => calculateNextDueDate('invalid', { value: 1, unit: 'weeks' })).toThrow('Invalid date provided');
    });

    it('should throw error for non-positive period value', () => {
      const baseDate = new Date('2025-01-01');
      expect(() => calculateNextDueDate(baseDate, { value: 0, unit: 'weeks' })).toThrow('Period value must be positive');
      expect(() => calculateNextDueDate(baseDate, { value: -1, unit: 'weeks' })).toThrow('Period value must be positive');
    });
  });

  describe('calculateScheduleDates', () => {
    it('should generate multiple schedule dates', () => {
      const firstDate = new Date('2025-01-01');
      const dates = calculateScheduleDates(firstDate, { value: 4, unit: 'weeks' }, 3);
      
      expect(dates).toHaveLength(3);
      expect(dates[0]).toEqual(new Date('2025-01-29'));
      expect(dates[1]).toEqual(new Date('2025-02-26'));
      expect(dates[2]).toEqual(new Date('2025-03-26'));
    });

    it('should default to 12 dates if count not specified', () => {
      const firstDate = new Date('2025-01-01');
      const dates = calculateScheduleDates(firstDate, { value: 1, unit: 'months' });
      expect(dates).toHaveLength(12);
    });
  });

  describe('isOverdue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for past dates', () => {
      expect(isOverdue(new Date('2025-01-14'))).toBe(true);
      expect(isOverdue('2025-01-01')).toBe(true);
    });

    it('should return false for today', () => {
      expect(isOverdue(new Date('2025-01-15'))).toBe(false);
    });

    it('should return false for future dates', () => {
      expect(isOverdue(new Date('2025-01-16'))).toBe(false);
      expect(isOverdue('2025-02-01')).toBe(false);
    });
  });

  describe('getDaysUntilDue', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return negative days for past dates', () => {
      expect(getDaysUntilDue(new Date('2025-01-10'))).toBe(-5);
    });

    it('should return 0 for today', () => {
      expect(getDaysUntilDue(new Date('2025-01-15'))).toBe(0);
    });

    it('should return positive days for future dates', () => {
      expect(getDaysUntilDue(new Date('2025-01-20'))).toBe(5);
      expect(getDaysUntilDue(new Date('2025-01-25'))).toBe(10);
    });
  });

  describe('formatScheduleStatus', () => {
    it('should return critical status for overdue', () => {
      const result = formatScheduleStatus(-5);
      expect(result).toEqual({
        status: 'overdue',
        urgency: 'critical',
        color: 'red'
      });
    });

    it('should return high urgency for today', () => {
      const result = formatScheduleStatus(0);
      expect(result).toEqual({
        status: 'today',
        urgency: 'high',
        color: 'orange'
      });
    });

    it('should return medium urgency for upcoming (within 7 days)', () => {
      const result = formatScheduleStatus(3);
      expect(result).toEqual({
        status: 'upcoming',
        urgency: 'medium',
        color: 'yellow'
      });
    });

    it('should return low urgency for future (more than 7 days)', () => {
      const result = formatScheduleStatus(10);
      expect(result).toEqual({
        status: 'future',
        urgency: 'low',
        color: 'green'
      });
    });
  });
});