import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class RBACMiddleware {
  private logger = getLogger('RBACMiddleware');
  private errorHandler = getErrorHandler();

  /**
   * Middleware to check if user has required permission
   * @param permission - Required permission slug
   */
  requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: {
              type: 'UNAUTHORIZED',
              message: 'Authentication required',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        const userPermissions = req.user.permissions || [];
        
        if (!userPermissions.includes(permission)) {
          res.status(403).json({
            success: false,
            error: {
              type: 'FORBIDDEN',
              message: `You do not have permission: ${permission}`,
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        next();
      } catch (error) {
        this.logger.error('Permission check failed', error as Error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Permission check failed',
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  };

  /**
   * Middleware to check if user has any of the required permissions
   * @param permissions - Array of permission slugs (OR logic)
   */
  requireAnyPermission = (permissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: {
              type: 'UNAUTHORIZED',
              message: 'Authentication required',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        const userPermissions = req.user.permissions || [];
        const hasPermission = permissions.some(perm => userPermissions.includes(perm));
        
        if (!hasPermission) {
          res.status(403).json({
            success: false,
            error: {
              type: 'FORBIDDEN',
              message: `You do not have any of the required permissions: ${permissions.join(', ')}`,
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        next();
      } catch (error) {
        this.logger.error('Permission check failed', error as Error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Permission check failed',
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  };

  /**
   * Middleware to check if user has required role
   * @param role - Required role slug
   */
  requireRole = (role: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: {
              type: 'UNAUTHORIZED',
              message: 'Authentication required',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        const userRoles = req.user.roles || [];
        
        if (!userRoles.includes(role)) {
          res.status(403).json({
            success: false,
            error: {
              type: 'FORBIDDEN',
              message: `You do not have role: ${role}`,
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        next();
      } catch (error) {
        this.logger.error('Role check failed', error as Error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Role check failed',
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  };

  /**
   * Middleware to check if user has any of the required roles
   * @param roles - Array of role slugs (OR logic)
   */
  requireAnyRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            error: {
              type: 'UNAUTHORIZED',
              message: 'Authentication required',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        const userRoles = req.user.roles || [];
        const hasRole = roles.some(r => userRoles.includes(r));
        
        if (!hasRole) {
          res.status(403).json({
            success: false,
            error: {
              type: 'FORBIDDEN',
              message: `You do not have any of the required roles: ${roles.join(', ')}`,
              timestamp: new Date().toISOString()
            }
          });
          return;
        }

        next();
      } catch (error) {
        this.logger.error('Role check failed', error as Error);
        res.status(500).json({
          success: false,
          error: {
            type: 'INTERNAL_ERROR',
            message: 'Role check failed',
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  };

  /**
   * Helper to check if user is owner of resource
   */
  isOwner = (resourceUserId: string | undefined, requestUserId: string | undefined): boolean => {
    return !!resourceUserId && !!requestUserId && resourceUserId === requestUserId;
  };

  /**
   * Helper to check if user is admin
   */
  isAdmin = (req: Request): boolean => {
    const userRoles = req.user?.roles || [];
    return userRoles.includes('admin');
  };

  /**
   * Helper to check if user is author or admin
   */
  isAuthorOrAdmin = (req: Request): boolean => {
    const userRoles = req.user?.roles || [];
    return userRoles.includes('author') || userRoles.includes('admin');
  };
}


