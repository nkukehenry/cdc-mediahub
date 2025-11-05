import { ISubcategoryRepository, SubcategoryEntity, CreateSubcategoryData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class SubcategoryRepository implements ISubcategoryRepository {
  private logger = getLogger('SubcategoryRepository');
  private errorHandler = getErrorHandler();

  async create(subcategoryData: CreateSubcategoryData): Promise<SubcategoryEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const subcategory: SubcategoryEntity = {
        id,
        name: subcategoryData.name,
        slug: subcategoryData.slug,
        description: subcategoryData.description,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        description: subcategory.description,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO subcategories (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('Subcategory created', { subcategoryId: id });
      return subcategory;
    } catch (error) {
      this.logger.error('Failed to create subcategory', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create subcategory', 'create', 'subcategories');
    }
  }

  async findById(id: string): Promise<SubcategoryEntity | null> {
    try {
      const subcategory = await DatabaseUtils.findOne<any>(
        'SELECT * FROM subcategories WHERE id = ?',
        [id]
      );

      if (!subcategory) {
        return null;
      }

      return this.mapToSubcategoryEntity(subcategory);
    } catch (error) {
      this.logger.error('Failed to find subcategory by id', error as Error, { subcategoryId: id });
      throw this.errorHandler.createDatabaseError('Failed to find subcategory by id', 'select', 'subcategories');
    }
  }

  async findBySlug(slug: string): Promise<SubcategoryEntity | null> {
    try {
      const subcategory = await DatabaseUtils.findOne<any>(
        'SELECT * FROM subcategories WHERE slug = ?',
        [slug]
      );

      if (!subcategory) {
        return null;
      }

      return this.mapToSubcategoryEntity(subcategory);
    } catch (error) {
      this.logger.error('Failed to find subcategory by slug', error as Error, { slug });
      throw this.errorHandler.createDatabaseError('Failed to find subcategory by slug', 'select', 'subcategories');
    }
  }

  async findAll(): Promise<SubcategoryEntity[]> {
    try {
      const subcategories = await DatabaseUtils.findMany<any>(
        'SELECT * FROM subcategories ORDER BY name'
      );
      return subcategories.map(subcategory => this.mapToSubcategoryEntity(subcategory));
    } catch (error) {
      this.logger.error('Failed to find all subcategories', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all subcategories', 'select', 'subcategories');
    }
  }

  async update(id: string, data: Partial<SubcategoryEntity>): Promise<SubcategoryEntity> {
    try {
      const updateData: any = {
        updated_at: DatabaseUtils.getCurrentTimestamp()
      };

      // Map camelCase fields to snake_case for database
      if (data.name !== undefined) updateData.name = data.name;
      if (data.slug !== undefined) updateData.slug = data.slug;
      if (data.description !== undefined) updateData.description = data.description;

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE subcategories SET ${set} WHERE id = ?`,
        params
      );

      const updatedSubcategory = await this.findById(id);
      if (!updatedSubcategory) {
        throw new Error('Subcategory not found after update');
      }

      this.logger.debug('Subcategory updated', { subcategoryId: id });
      return updatedSubcategory;
    } catch (error) {
      this.logger.error('Failed to update subcategory', error as Error, { subcategoryId: id });
      throw this.errorHandler.createDatabaseError('Failed to update subcategory', 'update', 'subcategories');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM subcategories WHERE id = ?',
        [id]
      );

      const deleted = result.changes > 0;
      this.logger.debug('Subcategory delete attempt', { subcategoryId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete subcategory', error as Error, { subcategoryId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete subcategory', 'delete', 'subcategories');
    }
  }

  private mapToSubcategoryEntity(dbSubcategory: any): SubcategoryEntity {
    return {
      id: dbSubcategory.id,
      name: dbSubcategory.name,
      slug: dbSubcategory.slug,
      description: dbSubcategory.description,
      createdAt: new Date(dbSubcategory.created_at),
      updatedAt: new Date(dbSubcategory.updated_at)
    };
  }
}

