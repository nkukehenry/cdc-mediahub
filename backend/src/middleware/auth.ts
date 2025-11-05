import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../services/AuthService';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export class AuthMiddleware {
  private logger = getLogger('AuthMiddleware');
  private errorHandler = getErrorHandler();

  constructor(private authService: AuthService) {}

  /**
   * Middleware to authenticate JWT token (required)
   * Adds user info to req.user
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required. Please provide a valid token.',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = await this.authService.verifyToken(token);

      if (!payload) {
        res.status(401).json({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Invalid or expired token.',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Attach user info to request
      req.user = payload;
      next();
    } catch (error) {
      this.logger.error('Authentication middleware error', error as Error);
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Authentication failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Middleware to optionally authenticate JWT token
   * If token is provided and valid, adds user info to req.user
   * If no token, continues without error (for public endpoints)
   */
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue as anonymous user
        next();
        return;
      }

      const token = authHeader.substring(7);
      const payload = await this.authService.verifyToken(token);

      if (payload) {
        req.user = payload;
      }
      // Even if token is invalid, continue (anonymous access)
      
      next();
    } catch (error) {
      // Log but don't block for optional auth
      this.logger.warn('Optional authentication failed', error as Error);
      next();
    }
  };
}


