'use client';

import { Grid3X3, List } from 'lucide-react';
import { ViewToggleProps } from '@/types/fileManager';
import { cn } from '@/utils/fileUtils';

export default function ViewToggle({ mode, onModeChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex bg-gray-100 rounded-lg p-1', className)}>
      <button
        onClick={() => onModeChange('grid')}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
          mode === 'grid' 
            ? 'bg-white shadow-sm text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'
        )}
        title="Grid view"
      >
        <Grid3X3 size={16} />
      </button>
      
      <button
        onClick={() => onModeChange('list')}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-md transition-colors',
          mode === 'list' 
            ? 'bg-white shadow-sm text-blue-600' 
            : 'text-gray-500 hover:text-gray-700'
        )}
        title="List view"
      >
        <List size={16} />
      </button>
    </div>
  );
}
