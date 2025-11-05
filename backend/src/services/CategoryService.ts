import { ICategoryService, ICategoryRepository, CategoryEntity, CreateCategoryData } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class CategoryService implements ICategoryService {
  private logger = getLogger('CategoryService');
  private errorHandler = getErrorHandler();

  constructor(private categoryRepository: ICategoryRepository) {}

  async createCategory(categoryData: CreateCategoryData): Promise<CategoryEntity> {
    try {
      // Check if category with same slug exists
      const existing = await this.categoryRepository.findBySlug(categoryData.slug);
      if (existing) {
        throw this.errorHandler.createValidationError('Category with this slug already exists', 'slug');
      }

      const category = await this.categoryRepository.create(categoryData);
      
      // Handle subcategory associations if provided
      if ((categoryData as any).subcategoryIds && Array.isArray((categoryData as any).subcategoryIds)) {
        for (const subcategoryId of (categoryData as any).subcategoryIds) {
          await this.categoryRepository.addSubcategory(category.id, subcategoryId);
        }
      }
      
      this.logger.info('Category created successfully', { categoryId: category.id });
      return category;
    } catch (error) {
      this.logger.error('Failed to create category', error as Error);
      throw error;
    }
  }

  async getCategory(id: string): Promise<CategoryEntity | null> {
    try {
      const category = await this.categoryRepository.findById(id);
      return category;
    } catch (error) {
      this.logger.error('Failed to get category', error as Error, { categoryId: id });
      throw error;
    }
  }

  async getAllCategories(): Promise<CategoryEntity[]> {
    try {
      const categories = await this.categoryRepository.findAll();
      return categories;
    } catch (error) {
      this.logger.error('Failed to get all categories', error as Error);
      throw error;
    }
  }

  async updateCategory(id: string, data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    try {
      const existing = await this.categoryRepository.findById(id);
      if (!existing) {
        throw this.errorHandler.createValidationError('Category not found', 'id');
      }

      // Check slug uniqueness if being updated
      if (data.slug && data.slug !== existing.slug) {
        const slugExists = await this.categoryRepository.findBySlug(data.slug);
        if (slugExists) {
          throw this.errorHandler.createValidationError('Category with this slug already exists', 'slug');
        }
      }

      const updated = await this.categoryRepository.update(id, data);
      this.logger.info('Category updated successfully', { categoryId: id });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update category', error as Error, { categoryId: id });
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw this.errorHandler.createValidationError('Category not found', 'id');
      }

      // Check if category has posts (would need post repository)
      // For now, allow deletion - in production, add this check

      const deleted = await this.categoryRepository.delete(id);
      this.logger.info('Category deleted successfully', { categoryId: id });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete category', error as Error, { categoryId: id });
      throw error;
    }
  }

  async addSubcategoryToCategory(categoryId: string, subcategoryId: string): Promise<boolean> {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw this.errorHandler.createValidationError('Category not found', 'categoryId');
      }

      const added = await this.categoryRepository.addSubcategory(categoryId, subcategoryId);
      this.logger.info('Subcategory added to category', { categoryId, subcategoryId });
      return added;
    } catch (error) {
      this.logger.error('Failed to add subcategory to category', error as Error, { categoryId, subcategoryId });
      throw error;
    }
  }

  async updateCategorySubcategories(categoryId: string, subcategoryIds: string[]): Promise<void> {
    try {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category) {
        throw this.errorHandler.createValidationError('Category not found', 'categoryId');
      }

      // Get current subcategories
      const currentSubcategories = await this.categoryRepository.getSubcategories(categoryId);
      const currentIds = currentSubcategories.map(s => s.id);
      
      // Find subcategories to add and remove
      const toAdd = subcategoryIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !subcategoryIds.includes(id));

      // Remove subcategories
      for (const subcategoryId of toRemove) {
        await this.categoryRepository.removeSubcategory(categoryId, subcategoryId);
      }

      // Add subcategories
      for (const subcategoryId of toAdd) {
        await this.categoryRepository.addSubcategory(categoryId, subcategoryId);
      }

      this.logger.info('Category subcategories updated', { 
        categoryId, 
        added: toAdd.length, 
        removed: toRemove.length 
      });
    } catch (error) {
      this.logger.error('Failed to update category subcategories', error as Error, { categoryId });
      throw error;
    }
  }

  async getCategorySubcategories(categoryId: string) {
    try {
      return await this.categoryRepository.getSubcategories(categoryId);
    } catch (error) {
      this.logger.error('Failed to get category subcategories', error as Error, { categoryId });
      throw error;
    }
  }
}

