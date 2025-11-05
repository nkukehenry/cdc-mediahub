'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartCardProps {
  title: string;
  data: Array<Record<string, any>>;
  dataKey: string;
  xKey?: string;
  xAngle?: number;
  height?: number;
  color?: string;
  layout?: 'horizontal' | 'vertical';
}

export default function BarChartCard({ 
  title, 
  data, 
  dataKey, 
  xKey = 'name',
  xAngle = 0,
  height = 250,
  color = '#4ECDC4',
  layout = 'vertical'
}: BarChartCardProps) {
  const isHorizontal = layout === 'horizontal';
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {isHorizontal ? (
          <>
            <XAxis type="number" stroke="#6b7280" />
            <YAxis dataKey={xKey} type="category" width={100} stroke="#6b7280" />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} angle={xAngle} textAnchor={xAngle < 0 ? 'end' : 'start'} height={xAngle !== 0 ? 60 : undefined} stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
          </>
        )}
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

