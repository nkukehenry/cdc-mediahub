import { Request, Response } from 'express';
import { ICategoryService } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { ValidationError, ErrorType } from '../interfaces';

export class CategoryController {
  private logger = getLogger('CategoryController');
  private errorHandler = getErrorHandler();

  constructor(private categoryService: ICategoryService) {}

  // Public endpoint - get all categories
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.categoryService.getAllCategories();
      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      this.logger.error('Get all categories failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Public endpoint - get category by id
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await this.categoryService.getCategory(id);

      if (!category) {
        res.status(404).json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'Category not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get subcategories for this category
      const subcategories = await this.categoryService.getCategorySubcategories(id);

      res.json({
        success: true,
        data: { 
          category,
          subcategories 
        }
      });
    } catch (error) {
      this.logger.error('Get category by id failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  // Admin endpoints
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, slug, description, coverImage, showOnMenu, menuOrder, subcategoryIds } = req.body;

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

      const category = await this.categoryService.createCategory({
        name,
        slug,
        description,
        coverImage,
        showOnMenu: showOnMenu !== undefined ? showOnMenu : true,
        menuOrder: menuOrder !== undefined ? menuOrder : 0,
        subcategoryIds: subcategoryIds || []
      } as any);

      res.status(201).json({
        success: true,
        data: { category }
      });
    } catch (error) {
      this.logger.error('Create category failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { subcategoryIds, ...updateData } = req.body;

      const category = await this.categoryService.updateCategory(id, updateData);
      
      // Handle subcategory updates if provided
      if (subcategoryIds !== undefined) {
        await this.categoryService.updateCategorySubcategories(id, subcategoryIds || []);
      }

      res.json({
        success: true,
        data: { category }
      });
    } catch (error) {
      this.logger.error('Update category failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.categoryService.deleteCategory(id);

      res.json({
        success: true,
        data: { deleted }
      });
    } catch (error) {
      this.logger.error('Delete category failed', error as Error);
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


