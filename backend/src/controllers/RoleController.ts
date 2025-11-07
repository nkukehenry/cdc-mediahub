import { Request, Response } from 'express';
import { RoleRepository } from '../repositories/RoleRepository';
import { PermissionRepository } from '../repositories/PermissionRepository';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { CreateRoleData } from '../interfaces';

export class RoleController {
  private logger = getLogger('RoleController');
  private errorHandler = getErrorHandler();

  constructor(
    private roleRepository: RoleRepository,
    private permissionRepository: PermissionRepository
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, slug, description, permissionIds } = req.body;

      if (!name || !slug) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Name and slug are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if role with same slug already exists
      const existingRole = await this.roleRepository.findBySlug(slug);
      if (existingRole) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Role with this slug already exists',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const roleData: CreateRoleData = {
        name,
        slug,
        description
      };

      const role = await this.roleRepository.create(roleData);

      // Assign permissions if provided
      if (Array.isArray(permissionIds) && permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          await this.permissionRepository.assignToRole(role.id, permissionId);
        }
      }

      // Fetch role with permissions
      const permissions = await this.permissionRepository.getRolePermissions(role.id);

      res.status(201).json({
        success: true,
        data: { 
          role: {
            ...role,
            permissions
          }
        }
      });
    } catch (error) {
      this.logger.error('Create role failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const roles = await this.roleRepository.findAll();
      
      // Fetch permissions for each role
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          const permissions = await this.permissionRepository.getRolePermissions(role.id);
          return {
            ...role,
            permissions
          };
        })
      );

      res.json({
        success: true,
        data: { roles: rolesWithPermissions }
      });
    } catch (error) {
      this.logger.error('Get all roles failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const role = await this.roleRepository.findById(id);

      if (!role) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Role not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const permissions = await this.permissionRepository.getRolePermissions(role.id);

      res.json({
        success: true,
        data: {
          role: {
            ...role,
            permissions
          }
        }
      });
    } catch (error) {
      this.logger.error('Get role by id failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, slug, description } = req.body;

      const role = await this.roleRepository.findById(id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Role not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if slug is being changed and if it already exists
      if (slug && slug !== role.slug) {
        const existingRole = await this.roleRepository.findBySlug(slug);
        if (existingRole) {
          res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Role with this slug already exists',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (slug !== undefined) updateData.slug = slug;
      if (description !== undefined) updateData.description = description;

      const updatedRole = await this.roleRepository.update(id, updateData);
      const permissions = await this.permissionRepository.getRolePermissions(updatedRole.id);

      res.json({
        success: true,
        data: {
          role: {
            ...updatedRole,
            permissions
          }
        }
      });
    } catch (error) {
      this.logger.error('Update role failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.roleRepository.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Role not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { deleted: true }
      });
    } catch (error) {
      this.logger.error('Delete role failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async assignPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;

      if (!Array.isArray(permissionIds)) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'permissionIds must be an array',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const role = await this.roleRepository.findById(id);
      if (!role) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Role not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get current permissions
      const currentPermissions = await this.permissionRepository.getRolePermissions(id);
      const currentPermissionIds = currentPermissions.map(p => p.id);

      // Remove permissions that are not in the new list
      for (const permissionId of currentPermissionIds) {
        if (!permissionIds.includes(permissionId)) {
          await this.permissionRepository.removeFromRole(id, permissionId);
        }
      }

      // Add new permissions
      for (const permissionId of permissionIds) {
        if (!currentPermissionIds.includes(permissionId)) {
          await this.permissionRepository.assignToRole(id, permissionId);
        }
      }

      const updatedPermissions = await this.permissionRepository.getRolePermissions(id);

      res.json({
        success: true,
        data: {
          role: {
            ...role,
            permissions: updatedPermissions
          }
        }
      });
    } catch (error) {
      this.logger.error('Assign permissions to role failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}

