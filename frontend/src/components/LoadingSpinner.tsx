'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/fileUtils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} />
    </div>
  );
}
