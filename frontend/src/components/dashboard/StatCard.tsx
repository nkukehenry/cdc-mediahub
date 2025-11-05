'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({ label, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-3 hover:shadow-lg transition-all duration-300 hover:border-au-corporate-green/20 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-gray-50 rounded-lg flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 truncate mb-0.5">{label}</p>
          <p className="text-xl font-bold text-au-grey-text truncate">{value}</p>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'} flex-shrink-0`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{typeof trend.value === 'number' ? `${Math.abs(trend.value)}%` : trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}

