'use client';

import { WeeklyCompletionRate } from '@/types/dashboard';

interface SimpleBarChartProps {
  data: WeeklyCompletionRate[];
}

export function SimpleBarChart({ data }: SimpleBarChartProps) {
  const maxRate = Math.max(...data.map(d => d.completionRate), 100);
  
  return (
    <div className="flex items-end justify-between h-32 space-x-2">
      {data.map((item, index) => (
        <div key={item.week} className="flex-1 flex flex-col items-center">
          <div className="flex-1 flex items-end">
            <div 
              className="bg-blue-500 rounded-t-sm min-h-1 transition-all duration-500 ease-out"
              style={{ 
                height: `${(item.completionRate / maxRate) * 100}%`,
                minHeight: item.completionRate > 0 ? '4px' : '1px'
              }}
              title={`${item.completionRate}% (${item.completedCount}/${item.totalScheduled})`}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">{item.weekLabel}</div>
        </div>
      ))}
    </div>
  );
}