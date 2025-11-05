'use client';

import { ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any, index?: number) => ReactNode;
  className?: string;
}

interface DataTableProps {
  title?: string;
  columns: Column[];
  data: Array<Record<string, any>>;
  emptyMessage?: string;
}

export default function DataTable({ title, columns, data, emptyMessage = 'No data available' }: DataTableProps) {
  return (
    <div className="overflow-hidden">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className={`py-3 px-4 text-left font-semibold text-gray-700 bg-gray-50 ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, index) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`py-3 px-4 ${column.className || ''}`}>
                      {column.render 
                        ? column.render(row[column.key], row, index) 
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

