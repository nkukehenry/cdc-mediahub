'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface PieChartCardProps {
  title: string;
  data: Array<{ name?: string; [key: string]: any }>;
  dataKey: string;
  nameKey?: string;
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

export default function PieChartCard({ 
  title, 
  data, 
  dataKey, 
  nameKey = 'name',
  colors = DEFAULT_COLORS,
  height = 250
}: PieChartCardProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ [nameKey]: name, percent }: any) => `${name || ''}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={90}
          fill="#8884d8"
          dataKey={dataKey}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

