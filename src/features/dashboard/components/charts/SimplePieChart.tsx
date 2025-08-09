'use client';

import { ItemTypeDistribution } from '@/types/dashboard';

interface SimplePieChartProps {
  data: ItemTypeDistribution[];
}

export function SimplePieChart({ data }: SimplePieChartProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const testPercentage = data.find(d => d.type === 'test')?.percentage || 0;
  const testOffset = circumference - (testPercentage / 100) * circumference;
  
  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <svg width="100" height="100" className="transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#3b82f6"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={testOffset}
            className="transition-all duration-500 ease-out"
          />
          <circle
            cx="50"
            cy="50"
            r={radius - 12}
            stroke="#10b981"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - ((data.find(d => d.type === 'injection')?.percentage || 0) / 100) * circumference}
            className="transition-all duration-500 ease-out"
          />
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.type} className="flex items-center space-x-2">
            <div 
              className={`w-3 h-3 rounded-full ${item.type === 'test' ? 'bg-blue-500' : 'bg-green-500'}`}
            />
            <span className="text-sm">
              {item.type === 'test' ? '검사' : '주사'}: {item.count}건 ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}