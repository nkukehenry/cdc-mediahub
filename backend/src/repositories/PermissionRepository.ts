import { IPermissionRepository, PermissionEntity, CreatePermissionData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class PermissionRepository implements IPermissionRepository {
  private logger = getLogger('PermissionRepository');
  private errorHandler = getErrorHandler();

  async create(permissionData: CreatePermissionData): Promise<PermissionEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const permission: PermissionEntity = {
        id,
        name: permissionData.name,
        slug: permissionData.slug,
        description: permissionData.description,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: permission.id,
        name: permission.name,
        slug: permission.slug,
        description: permission.description,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO permissions (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('Permission created', { permissionId: id });
      return permission;
    } catch (error) {
      this.logger.error('Failed to create permission', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create permission', 'create', 'permissions');
    }
  }

  async findById(id: string): Promise<PermissionEntity | null> {
    try {
      const permission = await DatabaseUtils.findOne<any>(
        'SELECT * FROM permissions WHERE id = ?',
        [id]
      );

      if (!permission) {
        return null;
      }

      return this.mapToPermissionEntity(permission);
    } catch (error) {
      this.logger.error('Failed to find permission by id', error as Error, { permissionId: id });
      throw this.errorHandler.createDatabaseError('Failed to find permission by id', 'select', 'permissions');
    }
  }

  async findBySlug(slug: string): Promise<PermissionEntity | null> {
    try {
      const permission = await DatabaseUtils.findOne<any>(
        'SELECT * FROM permissions WHERE slug = ?',
        [slug]
      );

      if (!permission) {
        return null;
      }

      return this.mapToPermissionEntity(permission);
    } catch (error) {
      this.logger.error('Failed to find permission by slug', error as Error, { slug });
      throw this.errorHandler.createDatabaseError('Failed to find permission by slug', 'select', 'permissions');
    }
  }

  async findAll(): Promise<PermissionEntity[]> {
    try {
      const permissions = await DatabaseUtils.findMany<any>(
        'SELECT * FROM permissions ORDER BY name'
      );
      return permissions.map(permission => this.mapToPermissionEntity(permission));
    } catch (error) {
      this.logger.error('Failed to find all permissions', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all permissions', 'select', 'permissions');
    }
  }

  async assignToRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT IGNORE INTO role_permissions (id, role_id, permission_id, created_at) VALUES (?, ?, ?, ?)`,
        [id, roleId, permissionId, now]
      );

      this.logger.debug('Permission assigned to role', { roleId, permissionId });
      return true;
    } catch (error) {
      this.logger.error('Failed to assign permission to role', error as Error, { roleId, permissionId });
      throw this.errorHandler.createDatabaseError('Failed to assign permission to role', 'insert', 'role_permissions');
    }
  }

  async removeFromRole(roleId: string, permissionId: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?',
        [roleId, permissionId]
      );

      const removed = result.changes > 0;
      this.logger.debug('Permission removed from role', { roleId, permissionId, removed });
      return removed;
    } catch (error) {
      this.logger.error('Failed to remove permission from role', error as Error, { roleId, permissionId });
      throw this.errorHandler.createDatabaseError('Failed to remove permission from role', 'delete', 'role_permissions');
    }
  }

  async getRolePermissions(roleId: string): Promise<PermissionEntity[]> {
    try {
      const permissions = await DatabaseUtils.findMany<any>(
        `SELECT p.* FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = ?`,
        [roleId]
      );
      return permissions.map(permission => this.mapToPermissionEntity(permission));
    } catch (error) {
      this.logger.error('Failed to get role permissions', error as Error, { roleId });
      throw this.errorHandler.createDatabaseError('Failed to get role permissions', 'select', 'role_permissions');
    }
  }

  async getUserPermissions(userId: string): Promise<PermissionEntity[]> {
    try {
      const permissions = await DatabaseUtils.findMany<any>(
        `SELECT DISTINCT p.* FROM permissions p
         INNER JOIN role_permissions rp ON p.id = rp.permission_id
         INNER JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = ?`,
        [userId]
      );
      return permissions.map(permission => this.mapToPermissionEntity(permission));
    } catch (error) {
      this.logger.error('Failed to get user permissions', error as Error, { userId });
      throw this.errorHandler.createDatabaseError('Failed to get user permissions', 'select', 'user_roles');
    }
  }

  async update(id: string, data: Partial<PermissionEntity>): Promise<PermissionEntity> {
    try {
      const updateData = {
        ...data,
        updated_at: DatabaseUtils.getCurrentTimestamp()
      };

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE permissions SET ${set} WHERE id = ?`,
        params
      );

      const updatedPermission = await this.findById(id);
      if (!updatedPermission) {
        throw new Error('Permission not found after update');
      }

      this.logger.debug('Permission updated', { permissionId: id });
      return updatedPermission;
    } catch (error) {
      this.logger.error('Failed to update permission', error as Error, { permissionId: id });
      throw this.errorHandler.createDatabaseError('Failed to update permission', 'update', 'permissions');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM permissions WHERE id = ?',
        [id]
      );

      const deleted = result.changes > 0;
      this.logger.debug('Permission delete attempt', { permissionId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete permission', error as Error, { permissionId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete permission', 'delete', 'permissions');
    }
  }

  private mapToPermissionEntity(dbPermission: any): PermissionEntity {
    return {
      id: dbPermission.id,
      name: dbPermission.name,
      slug: dbPermission.slug,
      description: dbPermission.description,
      createdAt: new Date(dbPermission.created_at),
      updatedAt: new Date(dbPermission.updated_at)
    };
  }
}

