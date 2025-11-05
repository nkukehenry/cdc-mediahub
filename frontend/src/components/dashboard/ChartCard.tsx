'use client';

import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  subtitle?: string;
}

export default function ChartCard({ title, children, className = '', subtitle }: ChartCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-au-grey-text">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

