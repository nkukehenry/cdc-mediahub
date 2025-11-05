'use client';

import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/fileUtils';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({ message, onDismiss, className }: ErrorMessageProps) {
  return (
    <div className={cn('flex items-center p-4 bg-au-red/10 border border-au-red rounded-lg', className)}>
      <AlertCircle size={20} className="text-au-red mr-3 flex-shrink-0" />
      <div className="flex-1 text-au-red text-sm">
        {message}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-3 text-au-red hover:text-au-red/80 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
