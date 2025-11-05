import { Request, Response } from 'express';
import { ISubcategoryService } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { ValidationError, ErrorType } from '../interfaces';

export class SubcategoryController {
  private logger = getLogger('SubcategoryController');
  private errorHandler = getErrorHandler();

  constructor(private subcategoryService: ISubcategoryService) {}

  // Public endpoint - get all subcategories
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const subcategories = await this.subcategoryService.getAllSubcategories();
      res.json({
        success: true,
        data: { subcategories }
      });
    } catch (error) {
      this.logger.error('Get all subcategories failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Public endpoint - get subcategory by id
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const subcategory = await this.subcategoryService.getSubcategory(id);

      if (!subcategory) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Subcategory not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.json({
        success: true,
        data: { subcategory }
      });
    } catch (error) {
      this.logger.error('Get subcategory by id failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Admin endpoints
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

      const subcategory = await this.subcategoryService.createSubcategory({
        name,
        slug,
        description
      });

      res.status(201).json({
        success: true,
        data: { subcategory }
      });
    } catch (error) {
      this.logger.error('Create subcategory failed', error as Error);
      const errorResponse = this.errorHandler.formatErrorResponse(error as Error);
      
      let statusCode = 500;
      if (error instanceof ValidationError || errorResponse.error.type === ErrorType.VALIDATION_ERROR) {
        statusCode = 400;
      }
      
      res.status(statusCode).json(errorResponse);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const subcategory = await this.subcategoryService.updateSubcategory(id, updateData);

      res.json({
        success: true,
        data: { subcategory }
      });
    } catch (error) {
      this.logger.error('Update subcategory failed', error as Error);
      const errorResponse = this.errorHandler.formatErrorResponse(error as Error);
      
      let statusCode = 500;
      if (error instanceof ValidationError || errorResponse.error.type === ErrorType.VALIDATION_ERROR) {
        statusCode = 400;
      } else if (errorResponse.error.type === 'NOT_FOUND') {
        statusCode = 404;
      }
      
      res.status(statusCode).json(errorResponse);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.subcategoryService.deleteSubcategory(id);

      res.json({
        success: true,
        data: { deleted }
      });
    } catch (error) {
      this.logger.error('Delete subcategory failed', error as Error);
      const errorResponse = this.errorHandler.formatErrorResponse(error as Error);
      
      // Determine status code based on error type
      let statusCode = 500;
      if (error instanceof ValidationError || errorResponse.error.type === ErrorType.VALIDATION_ERROR) {
        statusCode = 400;
      } else if (errorResponse.error.type === 'NOT_FOUND') {
        statusCode = 404;
      }
      
      res.status(statusCode).json(errorResponse);
    }
  }
}

