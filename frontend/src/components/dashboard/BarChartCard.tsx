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
  
  // Ensure data is an array and has values
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  // Debug: Log data structure (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('BarChartCard data:', data, 'dataKey:', dataKey, 'xKey:', xKey);
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: xAngle !== 0 ? 60 : 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {isHorizontal ? (
          <>
            <XAxis 
              type="number" 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              dataKey={xKey} 
              type="category" 
              width={120} 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
          </>
        ) : (
          <>
            <XAxis 
              dataKey={xKey} 
              angle={xAngle} 
              textAnchor={xAngle < 0 ? 'end' : 'start'} 
              height={xAngle !== 0 ? 80 : undefined} 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              interval={0}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              allowDecimals={false}
              domain={[0, 'auto']}
            />
          </>
        )}
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          cursor={{ fill: 'rgba(78, 205, 196, 0.1)' }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        <Bar 
          dataKey={dataKey} 
          fill={color} 
          radius={isHorizontal ? [0, 8, 8, 0] : [8, 8, 0, 0]}
          animationDuration={500}
          isAnimationActive={true}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

