import { IRoleRepository, RoleEntity, CreateRoleData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class RoleRepository implements IRoleRepository {
  private logger = getLogger('RoleRepository');
  private errorHandler = getErrorHandler();

  async create(roleData: CreateRoleData): Promise<RoleEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const role: RoleEntity = {
        id,
        name: roleData.name,
        slug: roleData.slug,
        description: roleData.description,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO roles (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('Role created', { roleId: id });
      return role;
    } catch (error) {
      this.logger.error('Failed to create role', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create role', 'create', 'roles');
    }
  }

  async findById(id: string): Promise<RoleEntity | null> {
    try {
      const role = await DatabaseUtils.findOne<any>(
        'SELECT * FROM roles WHERE id = ?',
        [id]
      );

      if (!role) {
        return null;
      }

      return this.mapToRoleEntity(role);
    } catch (error) {
      this.logger.error('Failed to find role by id', error as Error, { roleId: id });
      throw this.errorHandler.createDatabaseError('Failed to find role by id', 'select', 'roles');
    }
  }

  async findBySlug(slug: string): Promise<RoleEntity | null> {
    try {
      const role = await DatabaseUtils.findOne<any>(
        'SELECT * FROM roles WHERE slug = ?',
        [slug]
      );

      if (!role) {
        return null;
      }

      return this.mapToRoleEntity(role);
    } catch (error) {
      this.logger.error('Failed to find role by slug', error as Error, { slug });
      throw this.errorHandler.createDatabaseError('Failed to find role by slug', 'select', 'roles');
    }
  }

  async findAll(): Promise<RoleEntity[]> {
    try {
      const roles = await DatabaseUtils.findMany<any>(
        'SELECT * FROM roles ORDER BY name'
      );
      return roles.map(role => this.mapToRoleEntity(role));
    } catch (error) {
      this.logger.error('Failed to find all roles', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all roles', 'select', 'roles');
    }
  }

  async update(id: string, data: Partial<RoleEntity>): Promise<RoleEntity> {
    try {
      const updateData = {
        ...data,
        updated_at: DatabaseUtils.getCurrentTimestamp()
      };

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE roles SET ${set} WHERE id = ?`,
        params
      );

      const updatedRole = await this.findById(id);
      if (!updatedRole) {
        throw new Error('Role not found after update');
      }

      this.logger.debug('Role updated', { roleId: id });
      return updatedRole;
    } catch (error) {
      this.logger.error('Failed to update role', error as Error, { roleId: id });
      throw this.errorHandler.createDatabaseError('Failed to update role', 'update', 'roles');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM roles WHERE id = ?',
        [id]
      );

      const deleted = result.changes > 0;
      this.logger.debug('Role delete attempt', { roleId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete role', error as Error, { roleId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete role', 'delete', 'roles');
    }
  }

  async assignToUser(userId: string, roleId: string): Promise<boolean> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT IGNORE INTO user_roles (id, user_id, role_id, created_at) VALUES (?, ?, ?, ?)`,
        [id, userId, roleId, now]
      );

      this.logger.debug('Role assigned to user', { userId, roleId });
      return true;
    } catch (error) {
      this.logger.error('Failed to assign role to user', error as Error, { userId, roleId });
      throw this.errorHandler.createDatabaseError('Failed to assign role to user', 'insert', 'user_roles');
    }
  }

  async removeFromUser(userId: string, roleId: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
        [userId, roleId]
      );

      const removed = result.changes > 0;
      this.logger.debug('Role removed from user', { userId, roleId, removed });
      return removed;
    } catch (error) {
      this.logger.error('Failed to remove role from user', error as Error, { userId, roleId });
      throw this.errorHandler.createDatabaseError('Failed to remove role from user', 'delete', 'user_roles');
    }
  }

  async getUserRoles(userId: string): Promise<RoleEntity[]> {
    try {
      const roles = await DatabaseUtils.findMany<any>(
        `SELECT r.* FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = ?`,
        [userId]
      );
      return roles.map(role => this.mapToRoleEntity(role));
    } catch (error) {
      this.logger.error('Failed to get user roles', error as Error, { userId });
      throw this.errorHandler.createDatabaseError('Failed to get user roles', 'select', 'user_roles');
    }
  }

  private mapToRoleEntity(dbRole: any): RoleEntity {
    return {
      id: dbRole.id,
      name: dbRole.name,
      slug: dbRole.slug,
      description: dbRole.description,
      createdAt: new Date(dbRole.created_at),
      updatedAt: new Date(dbRole.updated_at)
    };
  }
}

