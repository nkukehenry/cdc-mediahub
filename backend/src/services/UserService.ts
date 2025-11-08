import { IUserRepository, IRoleRepository, UserEntity, CreateUserData, RoleEntity } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { EmailService, IEmailService } from './EmailService';
import crypto from 'crypto';

export interface IUserService {
  createUser(userData: CreateUserData): Promise<UserEntity>;
  getAllUsers(includeInactive?: boolean): Promise<UserEntity[]>;
  getUserById(id: string): Promise<UserEntity | null>;
  updateUser(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  blockUser(id: string): Promise<UserEntity>;
  unblockUser(id: string): Promise<UserEntity>;
  resetPassword(id: string, newPassword?: string): Promise<UserEntity>;
  deleteUser(id: string): Promise<boolean>;
}

export class UserService implements IUserService {
  private logger = getLogger('UserService');
  private errorHandler = getErrorHandler();

  constructor(
    private userRepository: IUserRepository,
    private roleRepository: IRoleRepository,
    private emailService?: IEmailService
  ) {}

  private sanitizeRoleIds(roleIds: string[] = []): string[] {
    return Array.from(
      new Set(
        roleIds
          .filter((roleId): roleId is string => typeof roleId === 'string')
          .map(roleId => roleId.trim())
          .filter(roleId => roleId.length > 0)
      )
    );
  }

  private async syncUserRoles(userId: string, roleIds?: string[]): Promise<void> {
    if (roleIds === undefined) {
      return;
    }

    const sanitizedRoleIds = this.sanitizeRoleIds(roleIds);
    const existingRoles = await this.roleRepository.getUserRoles(userId);
    const existingRoleIds = new Set(existingRoles.map(role => role.id));
    const targetRoleIds = new Set(sanitizedRoleIds);

    for (const roleId of targetRoleIds) {
      if (!existingRoleIds.has(roleId)) {
        await this.roleRepository.assignToUser(userId, roleId);
      }
    }

    for (const role of existingRoles) {
      if (!targetRoleIds.has(role.id)) {
        await this.roleRepository.removeFromUser(userId, role.id);
      }
    }

    if (targetRoleIds.size === 0) {
      const defaultRole = await this.roleRepository.findBySlug('author');
      if (defaultRole) {
        await this.roleRepository.assignToUser(userId, defaultRole.id);
      }
    }
  }

  private async buildUserResponse(user: UserEntity): Promise<Omit<UserEntity, 'password'> & { roles: RoleEntity[]; roleIds: string[] }> {
    const roles = await this.roleRepository.getUserRoles(user.id);
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      roles,
      roleIds: roles.map(role => role.id),
    };
  }

  async createUser(userData: CreateUserData): Promise<any> {
    try {
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        throw this.errorHandler.createValidationError(
          'Username, email, and password are required',
          'userData'
        );
      }

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw this.errorHandler.createValidationError(
          'User with this email already exists',
          'email'
        );
      }

      const existingUsername = await this.userRepository.findByUsername(userData.username);
      if (existingUsername) {
        throw this.errorHandler.createValidationError(
          'User with this username already exists',
          'username'
        );
      }

      // Create user
      const user = await this.userRepository.create(userData);

      // Assign roles (defaults handled in syncUserRoles)
      await this.syncUserRoles(user.id, userData.roleIds ?? []);

      this.logger.info('User created successfully', { userId: user.id });
      
      // Send welcome email
      if (this.emailService && user.email) {
        try {
          await this.emailService.sendWelcomeEmail(
            user.email,
            user.firstName || user.username,
            userData.password
          );
        } catch (error) {
          this.logger.warn('Failed to send welcome email', { userId: user.id, error: (error as Error).message });
          // Don't fail user creation if email fails
        }
      }
      
      return this.buildUserResponse(user);
    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      throw error;
    }
  }

  async getAllUsers(includeInactive: boolean = true): Promise<any[]> {
    try {
      const users = await this.userRepository.findAll(includeInactive);
      return Promise.all(users.map(user => this.buildUserResponse(user)));
    } catch (error) {
      this.logger.error('Failed to get all users', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to get all users', 'select', 'users');
    }
  }

  async getUserById(id: string): Promise<any | null> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return null;
      }
      
      return this.buildUserResponse(user);
    } catch (error) {
      this.logger.error('Failed to get user by id', error as Error, { userId: id });
      throw this.errorHandler.createDatabaseError('Failed to get user by id', 'select', 'users');
    }
  }

  async updateUser(id: string, data: Partial<UserEntity>, roleIds?: string[]): Promise<any> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw this.errorHandler.createValidationError('User not found', 'id');
      }

      // Don't allow password updates through this method (use resetPassword instead)
      const { password, ...updateData } = data;

      const updatedUser = await this.userRepository.update(id, updateData);

      await this.syncUserRoles(id, roleIds);
      
      return this.buildUserResponse(updatedUser);
    } catch (error) {
      this.logger.error('Failed to update user', error as Error, { userId: id });
      throw error;
    }
  }

  async blockUser(id: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw this.errorHandler.createValidationError('User not found', 'id');
      }

      const updatedUser = await this.userRepository.update(id, { isActive: false });
      const response = await this.buildUserResponse(updatedUser);
      this.logger.info('User blocked', { userId: id });
      
      // Send account blocked email
      if (this.emailService && updatedUser.email) {
        try {
          await this.emailService.sendAccountBlockedEmail(
            updatedUser.email,
            updatedUser.firstName || updatedUser.username
          );
        } catch (error) {
          this.logger.warn('Failed to send account blocked email', { userId: id, error: (error as Error).message });
        }
      }
      
      return response;
    } catch (error) {
      this.logger.error('Failed to block user', error as Error, { userId: id });
      throw error;
    }
  }

  async unblockUser(id: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw this.errorHandler.createValidationError('User not found', 'id');
      }

      const updatedUser = await this.userRepository.update(id, { isActive: true });
      const response = await this.buildUserResponse(updatedUser);
      this.logger.info('User unblocked', { userId: id });
      
      // Send account unblocked email
      if (this.emailService && updatedUser.email) {
        try {
          await this.emailService.sendAccountUnblockedEmail(
            updatedUser.email,
            updatedUser.firstName || updatedUser.username
          );
        } catch (error) {
          this.logger.warn('Failed to send account unblocked email', { userId: id, error: (error as Error).message });
        }
      }
      
      return response;
    } catch (error) {
      this.logger.error('Failed to unblock user', error as Error, { userId: id });
      throw error;
    }
  }

  async resetPassword(id: string, newPassword?: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw this.errorHandler.createValidationError('User not found', 'id');
      }

      // Generate random password if not provided
      const password = newPassword || crypto.randomBytes(12).toString('base64');
      
      const updatedUser = await this.userRepository.update(id, { 
        password,
        passwordResetToken: null,
        passwordResetExpires: null
      });
      
      this.logger.info('Password reset', { userId: id });
      
      // Send password reset email
      if (this.emailService && updatedUser.email) {
        try {
          await this.emailService.sendPasswordResetEmail(
            updatedUser.email,
            updatedUser.firstName || updatedUser.username,
            password
          );
        } catch (error) {
          this.logger.warn('Failed to send password reset email', { userId: id, error: (error as Error).message });
          // Don't fail password reset if email fails
        }
      }
      
      const response = await this.buildUserResponse(updatedUser);
      return { ...response, tempPassword: password } as any;
    } catch (error) {
      this.logger.error('Failed to reset password', error as Error, { userId: id });
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw this.errorHandler.createValidationError('User not found', 'id');
      }

      const deleted = await this.userRepository.delete(id);
      this.logger.info('User deleted', { userId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete user', error as Error, { userId: id });
      throw error;
    }
  }
}

