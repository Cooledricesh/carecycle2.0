# Dashboard API Documentation

## Overview

The CareCycle 2.0 dashboard API provides three main endpoints for fetching dashboard statistics, recent activity, and trend data for the psychiatric clinic management system.

## API Endpoints

### 1. Dashboard Statistics

**GET** `/api/dashboard/stats`

Returns overall dashboard statistics including patient counts, today's scheduled items, completion rates, and overdue items.

#### Response Format

```typescript
interface DashboardStatsResponse {
  totalPatients: number;
  todayScheduled: number;
  completionRates: {
    today: number;        // Percentage (0-100)
    thisWeek: number;     // Percentage (0-100)
    thisMonth: number;    // Percentage (0-100)
  };
  overdueItems: number;
}
```

#### Example Response

```json
{
  "totalPatients": 127,
  "todayScheduled": 8,
  "completionRates": {
    "today": 75.0,
    "thisWeek": 83.2,
    "thisMonth": 78.5
  },
  "overdueItems": 3
}
```

### 2. Recent Activity

**GET** `/api/dashboard/recent`

Returns recent completed activities and upcoming schedules.

#### Response Format

```typescript
interface DashboardRecentResponse {
  recentActivity: RecentActivity[];
  upcomingSchedules: UpcomingSchedule[];
}

interface RecentActivity {
  id: string;
  patientName: string;
  patientNumber: string;
  itemName: string;
  itemType: 'test' | 'injection';
  scheduledDate: string;        // YYYY-MM-DD
  completedDate: string | null; // YYYY-MM-DD
  actualCompletionDate: string | null; // YYYY-MM-DD
  status: 'pending' | 'completed' | 'skipped';
  notes?: string | null;
}

interface UpcomingSchedule {
  id: string;
  patientName: string;
  patientNumber: string;
  itemName: string;
  itemType: 'test' | 'injection';
  dueDate: string;      // YYYY-MM-DD
  daysDue: number;      // Days until due (negative if overdue)
}
```

#### Example Response

```json
{
  "recentActivity": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "patientName": "김철수",
      "patientNumber": "P-2024-001",
      "itemName": "심리검사",
      "itemType": "test",
      "scheduledDate": "2024-01-15",
      "completedDate": "2024-01-15",
      "actualCompletionDate": "2024-01-15",
      "status": "completed",
      "notes": "정상적으로 완료"
    }
  ],
  "upcomingSchedules": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "patientName": "박영희",
      "patientNumber": "P-2024-002",
      "itemName": "4주 주사",
      "itemType": "injection",
      "dueDate": "2024-01-17",
      "daysDue": 2
    }
  ]
}
```

### 3. Trend Data

**GET** `/api/dashboard/trends`

Returns trend data for charts including weekly completion rates and item type distribution.

#### Response Format

```typescript
interface DashboardTrendsResponse {
  weeklyCompletionRates: WeeklyCompletionRate[];
  itemTypeDistribution: ItemTypeDistribution[];
}

interface WeeklyCompletionRate {
  week: string;           // YYYY-MM-DD (Monday of the week)
  weekLabel: string;      // e.g., "Jan 1-7"
  completionRate: number; // Percentage (0-100)
  completedCount: number;
  totalScheduled: number;
}

interface ItemTypeDistribution {
  type: 'test' | 'injection';
  count: number;
  percentage: number;    // Percentage (0-100)
}
```

#### Example Response

```json
{
  "weeklyCompletionRates": [
    {
      "week": "2024-01-01",
      "weekLabel": "Jan 1-7",
      "completionRate": 85.7,
      "completedCount": 12,
      "totalScheduled": 14
    },
    {
      "week": "2024-01-08",
      "weekLabel": "Jan 8-14",
      "completionRate": 90.0,
      "completedCount": 18,
      "totalScheduled": 20
    }
  ],
  "itemTypeDistribution": [
    {
      "type": "test",
      "count": 45,
      "percentage": 35.4
    },
    {
      "type": "injection",
      "count": 82,
      "percentage": 64.6
    }
  ]
}
```

## Error Handling

All endpoints return a consistent error format:

```typescript
interface DashboardErrorResponse {
  error: string;
  message: string;
}
```

Example error response (HTTP 500):

```json
{
  "error": "Failed to fetch dashboard statistics",
  "message": "Database connection timeout"
}
```

## Usage Examples

### React/TypeScript Component

```typescript
import { useState, useEffect } from 'react';
import { DashboardStatsResponse } from '@/types/dashboard';

function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard statistics');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No data available</div>;

  return (
    <div className="dashboard-stats">
      <div className="stat-card">
        <h3>Total Patients</h3>
        <p>{stats.totalPatients}</p>
      </div>
      <div className="stat-card">
        <h3>Today's Scheduled</h3>
        <p>{stats.todayScheduled}</p>
      </div>
      <div className="stat-card">
        <h3>Today's Completion Rate</h3>
        <p>{stats.completionRates.today}%</p>
      </div>
      <div className="stat-card">
        <h3>Overdue Items</h3>
        <p>{stats.overdueItems}</p>
      </div>
    </div>
  );
}
```

### With TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { DashboardStatsResponse } from '@/types/dashboard';

function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStatsResponse> => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}
```

## Performance Considerations

1. **Caching**: Consider implementing Redis caching for frequently accessed data
2. **Database Indexes**: Ensure proper indexes are in place for date-based queries
3. **Query Optimization**: Use database views for complex aggregations
4. **Rate Limiting**: Implement rate limiting for API endpoints

## Database Query Performance

The API endpoints are optimized with:

- Indexed queries on `scheduled_date`, `next_due_date`, and foreign keys
- Efficient JOINs using Supabase's nested select syntax
- Limited result sets (e.g., last 10 activities)
- Date range filtering to reduce query scope

## Security

- All endpoints use server-side Supabase client with proper authentication
- Row Level Security (RLS) policies are enforced
- No sensitive patient data is exposed without proper authorization