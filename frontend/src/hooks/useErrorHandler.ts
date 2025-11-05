import { useCallback } from 'react';
import { errorHandler, handleError, showSuccess, showInfo, showWarning } from '@/utils/errorHandler';

/**
 * Hook that provides convenient error handling functions
 */
export function useErrorHandler() {
  const handleApiError = useCallback((error: unknown, defaultMessage?: string) => {
    handleError(error, defaultMessage);
  }, []);

  return {
    handleError: handleApiError,
    showSuccess,
    showInfo,
    showWarning,
    errorHandler,
  };
}

