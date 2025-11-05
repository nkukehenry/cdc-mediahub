import { 
  IErrorHandler, 
  ErrorType, 
  FileManagerError,
  ValidationError,
  FileNotFoundError,
  FolderNotFoundError,
  UploadError,
  ThumbnailError,
  DatabaseError,
  ConfigurationError
} from '../interfaces';
import { getLogger } from './Logger';

export class ErrorHandler implements IErrorHandler {
  private logger = getLogger('ErrorHandler');

  handle(error: Error, context?: any): void {
    // Log the error with context
    this.logger.error(`Error handled: ${error.message}`, error, {
      context,
      timestamp: new Date().toISOString()
    });

    // Additional error handling logic can be added here
    // For example: sending to external monitoring services, etc.
  }

  createError(type: ErrorType, message: string, context?: any): FileManagerError {
    let error: FileManagerError;

    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        error = new ValidationError(message, context);
        break;
      case ErrorType.FILE_NOT_FOUND:
        error = new FileNotFoundError(context?.fileId || 'unknown', context);
        break;
      case ErrorType.FOLDER_NOT_FOUND:
        error = new FolderNotFoundError(context?.folderId || 'unknown', context);
        break;
      case ErrorType.UPLOAD_ERROR:
        error = new UploadError(message, context);
        break;
      case ErrorType.THUMBNAIL_ERROR:
        error = new ThumbnailError(message, context);
        break;
      case ErrorType.DATABASE_ERROR:
        error = new DatabaseError(message, context);
        break;
      case ErrorType.CONFIGURATION_ERROR:
        error = new ConfigurationError(message, context);
        break;
      default:
        error = new FileManagerError(ErrorType.INTERNAL_ERROR, message, context);
    }

    // Log the creation of the error
    this.logger.error(`Error created: ${error.message}`, error, {
      type: error.type,
      context: error.context
    });

    return error;
  }

  // Utility methods for common error scenarios
  createValidationError(message: string, field?: string, value?: any): ValidationError {
    return this.createError(ErrorType.VALIDATION_ERROR, message, { field, value }) as ValidationError;
  }

  createFileNotFoundError(fileId: string, userId?: string): FileNotFoundError {
    return this.createError(ErrorType.FILE_NOT_FOUND, `File not found`, { fileId, userId }) as FileNotFoundError;
  }

  createFolderNotFoundError(folderId: string, userId?: string): FolderNotFoundError {
    return this.createError(ErrorType.FOLDER_NOT_FOUND, `Folder not found`, { folderId, userId }) as FolderNotFoundError;
  }

  createUploadError(message: string, fileName?: string, fileSize?: number): UploadError {
    return this.createError(ErrorType.UPLOAD_ERROR, message, { fileName, fileSize }) as UploadError;
  }

  createThumbnailError(message: string, filePath?: string): ThumbnailError {
    return this.createError(ErrorType.THUMBNAIL_ERROR, message, { filePath }) as ThumbnailError;
  }

  createDatabaseError(message: string, operation?: string, table?: string): DatabaseError {
    return this.createError(ErrorType.DATABASE_ERROR, message, { operation, table }) as DatabaseError;
  }

  createConfigurationError(message: string, configKey?: string): ConfigurationError {
    return this.createError(ErrorType.CONFIGURATION_ERROR, message, { configKey }) as ConfigurationError;
  }

  // Additional error types for auth and RBAC
  createUnauthorizedError(message: string = 'Unauthorized'): FileManagerError {
    return this.createError(ErrorType.INTERNAL_ERROR, message, { type: 'UNAUTHORIZED' });
  }

  createForbiddenError(message: string = 'Forbidden'): FileManagerError {
    return this.createError(ErrorType.INTERNAL_ERROR, message, { type: 'FORBIDDEN' });
  }

  // Error response formatter for API responses
  formatErrorResponse(error: Error): {
    error: {
      type: string;
      message: string;
      timestamp: string;
      context?: any;
    };
  } {
    if (error instanceof FileManagerError) {
      return {
        error: {
          type: error.type,
          message: error.message,
          timestamp: error.timestamp.toISOString(),
          context: error.context
        }
      };
    }

    // Generic error for non-FileManagerError instances
    return {
      error: {
        type: ErrorType.INTERNAL_ERROR,
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }
    };
  }

  // Async error wrapper for Express middleware
  asyncHandler = (fn: Function) => {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // Global error handler for Express
  globalErrorHandler = (error: Error, req: any, res: any, next: any) => {
    this.handle(error, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    });

    const errorResponse = this.formatErrorResponse(error);
    
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && errorResponse.error.type === ErrorType.INTERNAL_ERROR) {
      errorResponse.error.message = 'An unexpected error occurred';
      delete errorResponse.error.context;
    }

    res.status(this.getHttpStatusFromErrorType(errorResponse.error.type as ErrorType)).json(errorResponse);
  };

  private getHttpStatusFromErrorType(errorType: ErrorType): number {
    switch (errorType) {
      case ErrorType.VALIDATION_ERROR:
        return 400;
      case ErrorType.FILE_NOT_FOUND:
      case ErrorType.FOLDER_NOT_FOUND:
        return 404;
      case ErrorType.UPLOAD_ERROR:
      case ErrorType.THUMBNAIL_ERROR:
        return 422;
      case ErrorType.CONFIGURATION_ERROR:
        return 500;
      case ErrorType.DATABASE_ERROR:
        return 500;
      case ErrorType.INTERNAL_ERROR:
      default:
        return 500;
    }
  }
}

// Singleton instance
let globalErrorHandler: ErrorHandler | null = null;

export function getErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}
