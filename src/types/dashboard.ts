// Dashboard API Response Types

export interface DashboardStatsResponse {
  totalPatients: number;
  todayScheduled: number;
  completionRates: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  overdueItems: number;
}

export interface RecentActivity {
  id: string;
  patientName: string;
  patientNumber: string;
  itemName: string;
  itemType: 'test' | 'injection';
  scheduledDate: string;
  completedDate: string | null;
  actualCompletionDate: string | null;
  status: 'pending' | 'completed' | 'skipped';
  notes?: string | null;
}

export interface UpcomingSchedule {
  id: string;
  patientName: string;
  patientNumber: string;
  itemName: string;
  itemType: 'test' | 'injection';
  dueDate: string;
  daysDue: number;
}

export interface DashboardRecentResponse {
  recentActivity: RecentActivity[];
  upcomingSchedules: UpcomingSchedule[];
}

export interface WeeklyCompletionRate {
  week: string; // YYYY-MM-DD format (Monday of that week)
  weekLabel: string; // e.g., "Jan 1-7"
  completionRate: number;
  completedCount: number;
  totalScheduled: number;
}

export interface ItemTypeDistribution {
  type: 'test' | 'injection';
  count: number;
  percentage: number;
}

export interface DashboardTrendsResponse {
  weeklyCompletionRates: WeeklyCompletionRate[];
  itemTypeDistribution: ItemTypeDistribution[];
}

// Error response type for all dashboard APIs
export interface DashboardErrorResponse {
  error: string;
  message: string;
}