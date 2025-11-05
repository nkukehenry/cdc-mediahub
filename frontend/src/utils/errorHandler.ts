import toast from 'react-hot-toast';

export interface AppError {
  message: string;
  code?: string;
  type?: string;
  timestamp?: string;
}

/**
 * Global error handler that displays errors in toast notifications
 */
export class ErrorHandler {
  /**
   * Handles errors and shows them in toast notifications
   */
  handleError(error: unknown, defaultMessage: string = 'An error occurred'): void {
    const errorMessage = this.extractErrorMessage(error, defaultMessage);
    
    // Show error toast with brand red color
    toast.error(errorMessage, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#9F2241', // AU Red from brand colors
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        maxWidth: '400px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', error);
    }
  }

  /**
   * Shows a success toast
   */
  showSuccess(message: string): void {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#348F41', // AU Green from brand colors
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        maxWidth: '400px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  }

  /**
   * Shows an info toast
   */
  showInfo(message: string): void {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#1A5632', // AU Corporate Green from brand colors
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        maxWidth: '400px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  }

  /**
   * Shows a warning toast
   */
  showWarning(message: string): void {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#B4A269', // AU Gold from brand colors
        color: '#1a1a1a',
        padding: '12px 16px',
        borderRadius: '8px',
        maxWidth: '400px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  }

  /**
   * Extracts error message from various error types
   */
  private extractErrorMessage(error: unknown, defaultMessage: string): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      const err = error as any;
      
      // Check for API error format
      if (err.error?.message) {
        return err.error.message;
      }
      
      if (err.message) {
        return err.message;
      }
      
      if (err.response?.data?.error?.message) {
        return err.response.data.error.message;
      }
    }

    return defaultMessage;
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Convenience functions
export const handleError = (error: unknown, defaultMessage?: string) => {
  errorHandler.handleError(error, defaultMessage);
};

export const showSuccess = (message: string) => {
  errorHandler.showSuccess(message);
};

export const showInfo = (message: string) => {
  errorHandler.showInfo(message);
};

export const showWarning = (message: string) => {
  errorHandler.showWarning(message);
};

export const showError = (message: string) => {
  errorHandler.handleError(message, message);
};

