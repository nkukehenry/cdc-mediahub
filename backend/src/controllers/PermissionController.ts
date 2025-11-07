import { Request, Response } from 'express';
import { PermissionRepository } from '../repositories/PermissionRepository';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { CreatePermissionData } from '../interfaces';

export class PermissionController {
  private logger = getLogger('PermissionController');
  private errorHandler = getErrorHandler();

  constructor(private permissionRepository: PermissionRepository) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, slug, description } = req.body;

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

      // Check if permission with same slug already exists
      const existingPermission = await this.permissionRepository.findBySlug(slug);
      if (existingPermission) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Permission with this slug already exists',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const permissionData: CreatePermissionData = {
        name,
        slug,
        description
      };

      const permission = await this.permissionRepository.create(permissionData);

      res.status(201).json({
        success: true,
        data: { permission }
      });
    } catch (error) {
      this.logger.error('Create permission failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const permissions = await this.permissionRepository.findAll();

      res.json({
        success: true,
        data: { permissions }
      });
    } catch (error) {
      this.logger.error('Get all permissions failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const permission = await this.permissionRepository.findById(id);

      if (!permission) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Permission not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { permission }
      });
    } catch (error) {
      this.logger.error('Get permission by id failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, slug, description } = req.body;

      const permission = await this.permissionRepository.findById(id);
      if (!permission) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Permission not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if slug is being changed and if it already exists
      if (slug && slug !== permission.slug) {
        const existingPermission = await this.permissionRepository.findBySlug(slug);
        if (existingPermission) {
          res.status(400).json({
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              message: 'Permission with this slug already exists',
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

      const updatedPermission = await this.permissionRepository.update(id, updateData);

      res.json({
        success: true,
        data: { permission: updatedPermission }
      });
    } catch (error) {
      this.logger.error('Update permission failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.permissionRepository.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Permission not found',
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
      this.logger.error('Delete permission failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}

