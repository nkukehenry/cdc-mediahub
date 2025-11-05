import { ICategoryRepository, CategoryEntity, SubcategoryEntity, CreateCategoryData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { ValidationError } from '../interfaces';

export class CategoryRepository implements ICategoryRepository {
  private logger = getLogger('CategoryRepository');
  private errorHandler = getErrorHandler();

  async create(categoryData: CreateCategoryData): Promise<CategoryEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const category: CategoryEntity = {
        id,
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        coverImage: categoryData.coverImage,
        showOnMenu: categoryData.showOnMenu !== undefined ? categoryData.showOnMenu : true,
        menuOrder: categoryData.menuOrder !== undefined ? categoryData.menuOrder : 0,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        cover_image: category.coverImage,
        show_on_menu: category.showOnMenu ? 1 : 0,
        menu_order: category.menuOrder || 0,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO categories (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('Category created', { categoryId: id });
      return category;
    } catch (error) {
      this.logger.error('Failed to create category', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create category', 'create', 'categories');
    }
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    try {
      const category = await DatabaseUtils.findOne<any>(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );

      if (!category) {
        return null;
      }

      return this.mapToCategoryEntity(category);
    } catch (error) {
      this.logger.error('Failed to find category by id', error as Error, { categoryId: id });
      throw this.errorHandler.createDatabaseError('Failed to find category by id', 'select', 'categories');
    }
  }

  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    try {
      const category = await DatabaseUtils.findOne<any>(
        'SELECT * FROM categories WHERE slug = ?',
        [slug]
      );

      if (!category) {
        return null;
      }

      return this.mapToCategoryEntity(category);
    } catch (error) {
      this.logger.error('Failed to find category by slug', error as Error, { slug });
      throw this.errorHandler.createDatabaseError('Failed to find category by slug', 'select', 'categories');
    }
  }

  async findAll(): Promise<CategoryEntity[]> {
    try {
      const categories = await DatabaseUtils.findMany<any>(
        'SELECT * FROM categories ORDER BY menu_order ASC, name ASC'
      );
      return categories.map(category => this.mapToCategoryEntity(category));
    } catch (error) {
      this.logger.error('Failed to find all categories', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all categories', 'select', 'categories');
    }
  }

  async update(id: string, data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    try {
      const updateData: any = {
        updated_at: DatabaseUtils.getCurrentTimestamp()
      };

      // Map camelCase fields to snake_case for database
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.coverImage !== undefined) updateData.cover_image = data.coverImage;
      if (data.showOnMenu !== undefined) updateData.show_on_menu = data.showOnMenu ? 1 : 0;
      if (data.menuOrder !== undefined) updateData.menu_order = data.menuOrder;

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE categories SET ${set} WHERE id = ?`,
        params
      );

      const updatedCategory = await this.findById(id);
      if (!updatedCategory) {
        throw new Error('Category not found after update');
      }

      this.logger.debug('Category updated', { categoryId: id });
      return updatedCategory;
    } catch (error) {
      this.logger.error('Failed to update category', error as Error, { categoryId: id });
      throw this.errorHandler.createDatabaseError('Failed to update category', 'update', 'categories');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Check if category has posts
      try {
        const result = await DatabaseUtils.findOne<any>(
          'SELECT COUNT(*) as count FROM posts WHERE category_id = ?',
          [id]
        );
        
        // SQLite returns COUNT as a number, but it might be a string
        const count = result ? (typeof result.count === 'number' ? result.count : parseInt(result.count, 10) || 0) : 0;
        
        if (count > 0) {
          throw this.errorHandler.createValidationError(
            `Cannot delete category: ${count} post(s) are using this category. Please reassign or delete the posts first.`,
            'categoryId'
          );
        }
      } catch (checkError) {
        // If it's a ValidationError, rethrow it
        if (checkError instanceof ValidationError) {
          throw checkError;
        }
        // If the posts table doesn't exist or query fails, log but continue
        // This allows deletion to proceed if posts table isn't set up yet
        this.logger.warn('Failed to check posts for category', { 
          categoryId: id,
          error: checkError instanceof Error ? {
            name: checkError.name,
            message: checkError.message,
            stack: checkError.stack
          } : checkError
        });
      }

      const deleteResult = await DatabaseUtils.executeQuery(
        'DELETE FROM categories WHERE id = ?',
        [id]
      );

      const deleted = deleteResult.changes > 0;
      if (!deleted) {
        throw this.errorHandler.createValidationError('Category not found', 'categoryId');
      }
      
      this.logger.debug('Category delete attempt', { categoryId: id, deleted });
      return deleted;
    } catch (error) {
      // If it's already a ValidationError, rethrow it
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Check for SQLite foreign key constraint errors
      // SQLite returns error code 19 (SQLITE_CONSTRAINT) for foreign key violations
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.errno || (error as any)?.code;
      
      // Check error message or error code for foreign key constraint violations
      const isForeignKeyError = 
        errorMessage.includes('FOREIGN KEY constraint') || 
        errorMessage.includes('SQLITE_CONSTRAINT') || 
        errorMessage.includes('FOREIGN KEY constraint failed') ||
        errorMessage.includes('FOREIGN KEY') ||
        errorCode === 19 || // SQLITE_CONSTRAINT
        errorCode === 'SQLITE_CONSTRAINT';
      
      if (isForeignKeyError) {
        throw this.errorHandler.createValidationError(
          'Cannot delete category: it is referenced by other records (posts, etc.). Please remove all references first.',
          'categoryId'
        );
      }
      
      this.logger.error('Failed to delete category', error as Error, { 
        categoryId: id, 
        errorMessage,
        errorCode,
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw this.errorHandler.createDatabaseError('Failed to delete category', 'delete', 'categories');
    }
  }

  async addSubcategory(categoryId: string, subcategoryId: string): Promise<boolean> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      await DatabaseUtils.executeQuery(
        `INSERT OR IGNORE INTO category_subcategories (id, category_id, subcategory_id, created_at) VALUES (?, ?, ?, ?)`,
        [id, categoryId, subcategoryId, now]
      );

      this.logger.debug('Subcategory added to category', { categoryId, subcategoryId });
      return true;
    } catch (error) {
      this.logger.error('Failed to add subcategory to category', error as Error, { categoryId, subcategoryId });
      throw this.errorHandler.createDatabaseError('Failed to add subcategory to category', 'insert', 'category_subcategories');
    }
  }

  async removeSubcategory(categoryId: string, subcategoryId: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM category_subcategories WHERE category_id = ? AND subcategory_id = ?',
        [categoryId, subcategoryId]
      );

      const removed = result.changes > 0;
      this.logger.debug('Subcategory removed from category', { categoryId, subcategoryId, removed });
      return removed;
    } catch (error) {
      this.logger.error('Failed to remove subcategory from category', error as Error, { categoryId, subcategoryId });
      throw this.errorHandler.createDatabaseError('Failed to remove subcategory from category', 'delete', 'category_subcategories');
    }
  }

  async getSubcategories(categoryId: string): Promise<SubcategoryEntity[]> {
    try {
      const subcategories = await DatabaseUtils.findMany<any>(
        `SELECT s.* FROM subcategories s
         INNER JOIN category_subcategories cs ON s.id = cs.subcategory_id
         WHERE cs.category_id = ?
         ORDER BY s.name`,
        [categoryId]
      );
      
      return subcategories.map(subcategory => ({
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        description: subcategory.description,
        createdAt: new Date(subcategory.created_at),
        updatedAt: new Date(subcategory.updated_at)
      }));
    } catch (error) {
      this.logger.error('Failed to get category subcategories', error as Error, { categoryId });
      throw this.errorHandler.createDatabaseError('Failed to get category subcategories', 'select', 'category_subcategories');
    }
  }

  private mapToCategoryEntity(dbCategory: any): CategoryEntity {
    return {
      id: dbCategory.id,
      name: dbCategory.name,
      slug: dbCategory.slug,
      description: dbCategory.description,
      coverImage: dbCategory.cover_image,
      showOnMenu: dbCategory.show_on_menu === 1 || dbCategory.show_on_menu === true,
      menuOrder: dbCategory.menu_order || 0,
      createdAt: new Date(dbCategory.created_at),
      updatedAt: new Date(dbCategory.updated_at)
    };
  }
}

