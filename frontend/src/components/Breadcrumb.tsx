'use client';

import { Home, ChevronRight } from 'lucide-react';
import { BreadcrumbProps } from '@/types/fileManager';
import { cn } from '@/utils/fileUtils';

export default function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)}>
      <button
        onClick={() => onNavigate(-1)}
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
        title="Home"
      >
        <Home size={16} />
      </button>
      
      {path.length > 0 && (
        <>
          <ChevronRight size={14} className="text-gray-400" />
          {path.map((segment, index) => (
            <div key={index} className="flex items-center">
              <button
                onClick={() => onNavigate(index)}
                className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-32"
                title={segment}
              >
                {segment}
              </button>
              {index < path.length - 1 && (
                <ChevronRight size={14} className="text-gray-400 ml-1" />
              )}
            </div>
          ))}
        </>
      )}
    </nav>
  );
}
