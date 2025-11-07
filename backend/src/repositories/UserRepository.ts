import { IUserRepository, UserEntity, CreateUserData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import bcrypt from 'bcryptjs';

export class UserRepository implements IUserRepository {
  private logger = getLogger('UserRepository');
  private errorHandler = getErrorHandler();

  async create(userData: CreateUserData): Promise<UserEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user: UserEntity = {
        id,
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        jobTitle: userData.jobTitle,
        organization: userData.organization,
        bio: userData.bio,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        emailVerified: userData.emailVerified !== undefined ? userData.emailVerified : false,
        language: userData.language || 'en',
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: user.id,
        username: user.username,
        email: user.email,
        password: user.password,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        job_title: user.jobTitle,
        organization: user.organization,
        bio: user.bio,
        is_active: user.isActive ? 1 : 0,
        email_verified: user.emailVerified ? 1 : 0,
        language: user.language,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO users (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('User created', { userId: id });
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return user as UserEntity; // Keep type but will exclude password in service layer
    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create user', 'create', 'users');
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    try {
      const user = await DatabaseUtils.findOne<any>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      if (!user) {
        return null;
      }

      return this.mapToUserEntity(user);
    } catch (error) {
      this.logger.error('Failed to find user by id', error as Error, { userId: id });
      throw this.errorHandler.createDatabaseError('Failed to find user by id', 'select', 'users');
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const user = await DatabaseUtils.findOne<any>(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (!user) {
        return null;
      }

      return this.mapToUserEntity(user);
    } catch (error) {
      this.logger.error('Failed to find user by email', error as Error, { email });
      throw this.errorHandler.createDatabaseError('Failed to find user by email', 'select', 'users');
    }
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    try {
      const user = await DatabaseUtils.findOne<any>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!user) {
        return null;
      }

      return this.mapToUserEntity(user);
    } catch (error) {
      this.logger.error('Failed to find user by username', error as Error, { username });
      throw this.errorHandler.createDatabaseError('Failed to find user by username', 'select', 'users');
    }
  }

  // Get all users (including inactive for admin)
  async findAll(includeInactive: boolean = false): Promise<UserEntity[]> {
    try {
      const query = includeInactive 
        ? 'SELECT * FROM users ORDER BY created_at DESC'
        : 'SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC';
      const users = await DatabaseUtils.findMany<any>(query);
      return users.map(user => this.mapToUserEntity(user));
    } catch (error) {
      this.logger.error('Failed to find all users', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all users', 'select', 'users');
    }
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    try {
      const updateData: any = { ...data };
      
      // Hash password if being updated
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      
      updateData.updated_at = DatabaseUtils.getCurrentTimestamp();

      // Convert camelCase to snake_case
      const dbData: any = {};
      if (updateData.firstName !== undefined) dbData.first_name = updateData.firstName;
      if (updateData.lastName !== undefined) dbData.last_name = updateData.lastName;
      if (updateData.username !== undefined) dbData.username = updateData.username;
      if (updateData.email !== undefined) dbData.email = updateData.email;
      if (updateData.password !== undefined) dbData.password = updateData.password;
      if (updateData.avatar !== undefined) dbData.avatar = updateData.avatar;
      if (updateData.phone !== undefined) dbData.phone = updateData.phone;
      if (updateData.jobTitle !== undefined) dbData.job_title = updateData.jobTitle;
      if (updateData.organization !== undefined) dbData.organization = updateData.organization;
      if (updateData.bio !== undefined) dbData.bio = updateData.bio;
      if (updateData.isActive !== undefined) dbData.is_active = updateData.isActive ? 1 : 0;
      if (updateData.emailVerified !== undefined) dbData.email_verified = updateData.emailVerified ? 1 : 0;
      if (updateData.language !== undefined) dbData.language = updateData.language;
      if (updateData.lastLogin !== undefined) {
        dbData.last_login = updateData.lastLogin instanceof Date ? updateData.lastLogin.toISOString() : (updateData.lastLogin === null ? null : updateData.lastLogin);
      }
      if (updateData.passwordResetToken !== undefined) {
        dbData.password_reset_token = updateData.passwordResetToken === null ? null : updateData.passwordResetToken;
      }
      if (updateData.passwordResetExpires !== undefined) {
        dbData.password_reset_expires = updateData.passwordResetExpires instanceof Date ? updateData.passwordResetExpires.toISOString() : (updateData.passwordResetExpires === null ? null : updateData.passwordResetExpires);
      }
      dbData.updated_at = updateData.updated_at;

      const { set, values } = DatabaseUtils.buildUpdateSet(dbData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE users SET ${set} WHERE id = ?`,
        params
      );

      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new Error('User not found after update');
      }

      this.logger.debug('User updated', { userId: id });
      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user', error as Error, { userId: id });
      throw this.errorHandler.createDatabaseError('Failed to update user', 'update', 'users');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM users WHERE id = ?',
        [id]
      );

      const deleted = result.changes > 0;
      this.logger.debug('User delete attempt', { userId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete user', error as Error, { userId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete user', 'delete', 'users');
    }
  }

  private mapToUserEntity(dbUser: any): UserEntity {
    return {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      password: dbUser.password,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      avatar: dbUser.avatar,
      phone: dbUser.phone,
      jobTitle: dbUser.job_title,
      organization: dbUser.organization,
      bio: dbUser.bio,
      isActive: Boolean(dbUser.is_active),
      emailVerified: Boolean(dbUser.email_verified),
      language: (dbUser.language || 'en') as 'ar' | 'en' | 'fr' | 'pt' | 'es' | 'sw',
      lastLogin: dbUser.last_login ? new Date(dbUser.last_login) : undefined,
      passwordResetToken: dbUser.password_reset_token || undefined,
      passwordResetExpires: dbUser.password_reset_expires ? new Date(dbUser.password_reset_expires) : undefined,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at)
    };
  }
}

