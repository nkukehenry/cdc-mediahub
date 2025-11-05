import { ISubcategoryService, ISubcategoryRepository, SubcategoryEntity, CreateSubcategoryData } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class SubcategoryService implements ISubcategoryService {
  private logger = getLogger('SubcategoryService');
  private errorHandler = getErrorHandler();

  constructor(private subcategoryRepository: ISubcategoryRepository) {}

  async createSubcategory(subcategoryData: CreateSubcategoryData): Promise<SubcategoryEntity> {
    try {
      // Check if subcategory with same slug exists
      const existing = await this.subcategoryRepository.findBySlug(subcategoryData.slug);
      if (existing) {
        throw this.errorHandler.createValidationError('Subcategory with this slug already exists', 'slug');
      }

      const subcategory = await this.subcategoryRepository.create(subcategoryData);
      this.logger.info('Subcategory created successfully', { subcategoryId: subcategory.id });
      return subcategory;
    } catch (error) {
      this.logger.error('Failed to create subcategory', error as Error);
      throw error;
    }
  }

  async getSubcategory(id: string): Promise<SubcategoryEntity | null> {
    try {
      const subcategory = await this.subcategoryRepository.findById(id);
      return subcategory;
    } catch (error) {
      this.logger.error('Failed to get subcategory', error as Error, { subcategoryId: id });
      throw error;
    }
  }

  async getAllSubcategories(): Promise<SubcategoryEntity[]> {
    try {
      const subcategories = await this.subcategoryRepository.findAll();
      return subcategories;
    } catch (error) {
      this.logger.error('Failed to get all subcategories', error as Error);
      throw error;
    }
  }

  async updateSubcategory(id: string, data: Partial<SubcategoryEntity>): Promise<SubcategoryEntity> {
    try {
      const existing = await this.subcategoryRepository.findById(id);
      if (!existing) {
        throw this.errorHandler.createValidationError('Subcategory not found', 'id');
      }

      // Check slug uniqueness if being updated
      if (data.slug && data.slug !== existing.slug) {
        const slugExists = await this.subcategoryRepository.findBySlug(data.slug);
        if (slugExists) {
          throw this.errorHandler.createValidationError('Subcategory with this slug already exists', 'slug');
        }
      }

      const updated = await this.subcategoryRepository.update(id, data);
      this.logger.info('Subcategory updated successfully', { subcategoryId: id });
      return updated;
    } catch (error) {
      this.logger.error('Failed to update subcategory', error as Error, { subcategoryId: id });
      throw error;
    }
  }

  async deleteSubcategory(id: string): Promise<boolean> {
    try {
      const subcategory = await this.subcategoryRepository.findById(id);
      if (!subcategory) {
        throw this.errorHandler.createValidationError('Subcategory not found', 'id');
      }

      // Check if subcategory has posts (would need post repository)
      // For now, allow deletion - in production, add this check

      const deleted = await this.subcategoryRepository.delete(id);
      this.logger.info('Subcategory deleted successfully', { subcategoryId: id });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete subcategory', error as Error, { subcategoryId: id });
      throw error;
    }
  }
}

