'use client';

import { cn } from '@/utils/fileUtils';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

export default function LoadingOverlay({ isLoading, message = 'Loading...', className }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex items-center justify-center',
        className
      )}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Slider Animation */}
        <div className="relative w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* Sliding bar */}
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-au-corporate-green via-au-gold to-au-corporate-green rounded-full animate-loading-slide">
            <div className="absolute inset-0 bg-white/30 animate-loading-shimmer"></div>
          </div>
        </div>

        {/* Loading message */}
        <p className="text-au-grey-text font-medium text-sm md:text-base animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}

