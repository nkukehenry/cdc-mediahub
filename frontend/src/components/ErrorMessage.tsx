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
    <div className={cn('flex items-center p-4 bg-red-50 border border-red-200 rounded-lg', className)}>
      <AlertCircle size={20} className="text-red-600 mr-3 flex-shrink-0" />
      <div className="flex-1 text-red-800 text-sm">
        {message}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-3 text-red-600 hover:text-red-800 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
