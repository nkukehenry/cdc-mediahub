import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class AuthController {
  private logger = getLogger('AuthController');
  private errorHandler = getErrorHandler();

  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, firstName, lastName } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Username, email, and password are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.authService.register({
        username,
        email,
        password,
        firstName,
        lastName
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          roles: result.roles,
          permissions: result.permissions
        }
      });
    } catch (error) {
      this.logger.error('Registration failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await this.authService.login(email, password);

      res.json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          roles: result.roles,
          permissions: result.permissions
        }
      });
    } catch (error) {
      this.logger.error('Login failed', error as Error);
      
      // Check if it's a validation error (invalid credentials)
      if ((error as any).type === 'VALIDATION_ERROR') {
        res.status(401).json(this.errorHandler.formatErrorResponse(error as Error));
      } else {
        res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
      }
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
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

      const user = await this.authService.getUserById(req.user.userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const roles = await this.authService.getUserRoles(req.user.userId);
      const permissions = await this.authService.getUserPermissions(req.user.userId);

      res.json({
        success: true,
        data: {
          user,
          roles,
          permissions
        }
      });
    } catch (error) {
      this.logger.error('Get me failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}


