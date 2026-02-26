import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { IUserRepository, UserEntity, CreateUserData, IRoleRepository, IPermissionRepository } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { IEmailService } from './EmailService';
import crypto from 'crypto';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  isAdmin?: boolean;
}

export interface AuthResult {
  user: Omit<UserEntity, 'password'>;
  token: string;
  roles: string[];
  permissions: string[];
  isAdmin: boolean;
}

export class AuthService {
  private logger = getLogger('AuthService');
  private errorHandler = getErrorHandler();
  private jwtSecret: string;

  constructor(
    private userRepository: IUserRepository,
    private roleRepository: IRoleRepository,
    private permissionRepository: IPermissionRepository,
    private emailService: IEmailService,
    jwtSecret: string
  ) {
    this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'default-secret-change-me';
  }

  async register(userData: CreateUserData): Promise<AuthResult> {
    try {
      const normalizedUserData: CreateUserData = {
        ...userData,
        username: userData.username ?? userData.email
      };

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(normalizedUserData.email);
      if (existingUser) {
        throw this.errorHandler.createValidationError('User with this email already exists', 'email');
      }

      // Create user
      const user = await this.userRepository.create(normalizedUserData);

      // Get default roles (assign 'author' role by default)
      const defaultRole = await this.roleRepository.findBySlug('author');
      if (defaultRole) {
        await this.roleRepository.assignToUser(user.id, defaultRole.id);
      }

      // Get user roles and permissions
      const roleEntities = await this.roleRepository.getUserRoles(user.id);
      const permissionEntities = await this.permissionRepository.getUserPermissions(user.id);

      const roleSlugs = roleEntities.map(r => r.slug);
      const permissionSlugs = permissionEntities.map(p => p.slug);
      const isAdmin = this.hasAdminAccess(roleSlugs, permissionSlugs);

      // Generate JWT
      const token = this.generateToken(user, roleSlugs, permissionSlugs, isAdmin);

      this.logger.info('User registered successfully', { userId: user.id });

      const { password, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        token,
        roles: roleSlugs,
        permissions: permissionSlugs,
        isAdmin
      };
    } catch (error) {
      this.logger.error('Registration failed', error as Error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw this.errorHandler.createValidationError('Invalid email or password');
      }

      if (!user.isActive) {
        throw this.errorHandler.createValidationError('User account is inactive');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw this.errorHandler.createValidationError('Invalid email or password');
      }

      // Get user roles and permissions
      const roleEntities = await this.roleRepository.getUserRoles(user.id);
      const permissionEntities = await this.permissionRepository.getUserPermissions(user.id);

      const roleSlugs = roleEntities.map(r => r.slug);
      const permissionSlugs = permissionEntities.map(p => p.slug);
      const isAdmin = this.hasAdminAccess(roleSlugs, permissionSlugs);

      // Generate JWT
      const token = this.generateToken(user, roleSlugs, permissionSlugs, isAdmin);

      this.logger.info('User logged in successfully', { userId: user.id });

      const { password: _, ...userWithoutPassword } = user;
      return {
        user: userWithoutPassword,
        token,
        roles: roleSlugs,
        permissions: permissionSlugs,
        isAdmin
      };
    } catch (error) {
      this.logger.error('Login failed', error as Error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      if (typeof decoded.isAdmin === 'undefined') {
        decoded.isAdmin = this.hasAdminAccess(decoded.roles ?? [], decoded.permissions ?? []);
      }

      return decoded;
    } catch (error) {
      this.logger.warn('Token verification failed', error as Error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<Omit<UserEntity, 'password'> | null> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return null;
      }

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Failed to get user by id', error as Error, { userId });
      throw error;
    }
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const permissions = await this.permissionRepository.getUserPermissions(userId);
      return permissions.map(p => p.slug);
    } catch (error) {
      this.logger.error('Failed to get user permissions', error as Error, { userId });
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const roles = await this.roleRepository.getUserRoles(userId);
      return roles.map(r => r.slug);
    } catch (error) {
      this.logger.error('Failed to get user roles', error as Error, { userId });
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    phone?: string;
    jobTitle?: string;
    organization?: string;
    bio?: string;
  }): Promise<UserEntity> {
    try {
      // Check if email is being updated and if it's already taken
      if (data.email) {
        const existingUser = await this.userRepository.findByEmail(data.email);
        if (existingUser && existingUser.id !== userId) {
          throw this.errorHandler.createValidationError('Email is already in use', 'email');
        }
      }

      const updatedUser = await this.userRepository.update(userId, data);
      this.logger.info('User profile updated', { userId });
      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user profile', error as Error, { userId });
      throw error;
    }
  }

  private generateToken(user: UserEntity, roles: string[], permissions: string[], isAdmin: boolean): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      roles,
      permissions,
      isAdmin
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '7d' // Token expires in 7 days
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        // For security reasons, don't reveal if user exists
        this.logger.info('Password reset requested for non-existent email', { email });
        return;
      }

      // Generate secure token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await this.userRepository.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.firstName || user.username,
        resetUrl
      );

      this.logger.info('Password reset email sent', { userId: user.id });
    } catch (error) {
      this.logger.error('Failed to request password reset', error as Error, { email });
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Find user by token
      // Note: We need a way to find by token. I'll check if UserRepository has this or add it.
      // Based on previous scan, UserRepository doesn't have findByToken. I'll use a direct query or add it.
      // For now, I'll assume I can find it directly or I'll add the method to Repository.

      // Let's check UserRepository again or just use a generic update if I can't find it.
      // Actually, I'll add findByResetToken to UserRepository.
      const user = await (this.userRepository as any).findByResetToken(token);

      if (!user) {
        throw this.errorHandler.createValidationError('Invalid or expired password reset token');
      }

      this.logger.debug('Checking reset token expiry', {
        expires: user.passwordResetExpires?.toISOString(),
        now: new Date().toISOString(),
        isExpired: user.passwordResetExpires && user.passwordResetExpires.getTime() < Date.now()
      });

      if (user.passwordResetExpires && user.passwordResetExpires.getTime() < Date.now()) {
        throw this.errorHandler.createValidationError('Password reset token has expired');
      }

      // Update password and clear reset token
      await this.userRepository.update(user.id, {
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      this.logger.info('Password reset successfully', { userId: user.id });

      // Optional: send confirmation email
      await this.emailService.sendPasswordChangedEmail(user.email, user.firstName || user.username);
    } catch (error) {
      this.logger.error('Failed to reset password', error as Error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw this.errorHandler.createValidationError('User not found');
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw this.errorHandler.createValidationError('Incorrect current password');
      }

      await this.userRepository.update(userId, {
        password: newPassword
      });

      this.logger.info('Password changed successfully', { userId });
    } catch (error) {
      this.logger.error('Failed to change password', error as Error, { userId });
      throw error;
    }
  }

  public hasAdminAccess(roles: string[] = [], permissions: string[] = []): boolean {
    if (roles.some(role => role && role !== 'author')) {
      return true;
    }

    // Reserved for future permission-based admin detection if needed
    return false;
  }
}

