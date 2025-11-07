import { Request, Response } from 'express';
import { UserService } from '../services/UserService';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { CreateUserData } from '../interfaces';

export class UserController {
  private logger = getLogger('UserController');
  private errorHandler = getErrorHandler();

  constructor(private userService: UserService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        phone,
        jobTitle,
        organization,
        bio,
        language,
        isActive,
        emailVerified,
        roleIds
      } = req.body;

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

      const userData: CreateUserData = {
        username,
        email,
        password,
        firstName,
        lastName,
        phone,
        jobTitle,
        organization,
        bio,
        language,
        isActive: isActive !== undefined ? isActive : true,
        emailVerified: emailVerified !== undefined ? emailVerified : false,
        roleIds: Array.isArray(roleIds) ? roleIds : []
      };

      const user = await this.userService.createUser(userData);

      res.status(201).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      this.logger.error('Create user failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const users = await this.userService.getAllUsers(includeInactive);

      res.json({
        success: true,
        data: { users }
      });
    } catch (error) {
      this.logger.error('Get all users failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

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

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      this.logger.error('Get user by id failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Don't allow password updates through this endpoint
      delete updateData.password;

      const user = await this.userService.updateUser(id, updateData);

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      this.logger.error('Update user failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async block(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.blockUser(id);

      res.json({
        success: true,
        data: { user },
        message: 'User blocked successfully'
      });
    } catch (error) {
      this.logger.error('Block user failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async unblock(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.unblockUser(id);

      res.json({
        success: true,
        data: { user },
        message: 'User unblocked successfully'
      });
    } catch (error) {
      this.logger.error('Unblock user failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      const user = await this.userService.resetPassword(id, newPassword);

      res.json({
        success: true,
        data: { 
          user,
          tempPassword: (user as any).tempPassword // Temporary password if generated
        },
        message: newPassword ? 'Password reset successfully' : 'Temporary password generated'
      });
    } catch (error) {
      this.logger.error('Reset password failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.userService.deleteUser(id);

      if (!deleted) {
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

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      this.logger.error('Delete user failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}

