'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AreaData {
  [key: string]: string | number;
}

interface AreaChartCardProps {
  title: string;
  data: AreaData[];
  areas: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  xKey?: string;
}

export default function AreaChartCard({ 
  title, 
  data, 
  areas, 
  height = 300,
  xKey = 'name'
}: AreaChartCardProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          {areas.map((area, index) => (
            <linearGradient key={index} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={area.color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={area.color} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} stroke="#6b7280" />
        <YAxis stroke="#6b7280" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
        />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />
        {areas.map((area, index) => (
          <Area 
            key={index}
            type="monotone" 
            dataKey={area.dataKey} 
            stroke={area.color} 
            fillOpacity={1} 
            fill={`url(#color${index})`} 
            name={area.name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

