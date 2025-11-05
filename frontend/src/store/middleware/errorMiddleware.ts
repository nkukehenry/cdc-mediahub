import { Middleware } from '@reduxjs/toolkit';
import { errorHandler } from '@/utils/errorHandler';

/**
 * Redux middleware that catches errors from rejected thunks and shows toast notifications
 */
export const errorMiddleware: Middleware = () => (next) => (action: any) => {
  // Check if this is a rejected async thunk
  if (action.type?.endsWith('/rejected')) {
    const error = action.error;
    
    // Only show toast for actual errors (not if user intentionally cancelled)
    if (error && error.message) {
      // Skip showing toast for certain error types that are handled elsewhere
      const skipToastErrors = [
        'ABORT_ERR',
        'AbortError',
      ];

      const shouldSkip = skipToastErrors.some(skipType => 
        error.message?.includes(skipType) || error.name === skipType
      );

      if (!shouldSkip) {
        errorHandler.handleError(error, error.message || 'An error occurred');
      }
    }
  }

  return next(action);
};

