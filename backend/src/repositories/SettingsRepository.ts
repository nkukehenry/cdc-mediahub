import { ISettingsRepository, SettingsEntity, ValidationError } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class SettingsRepository implements ISettingsRepository {
  private logger = getLogger('SettingsRepository');
  private errorHandler = getErrorHandler();

  async findByKey(key: string): Promise<SettingsEntity | null> {
    try {
      const row = await DatabaseUtils.findOne<{
        id: string;
        key: string;
        value: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      }>(
        'SELECT * FROM settings WHERE key = ?',
        [key]
      );

      if (!row) {
        return null;
      }

      return this.mapToSettingsEntity(row);
    } catch (error) {
      this.logger.error('Failed to find setting by key', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find setting', 'read', 'settings');
    }
  }

  async findAll(): Promise<SettingsEntity[]> {
    try {
      const rows = await DatabaseUtils.findMany<{
        id: string;
        key: string;
        value: string;
        description: string | null;
        created_at: string;
        updated_at: string;
      }>('SELECT * FROM settings ORDER BY key');

      return rows.map(row => this.mapToSettingsEntity(row));
    } catch (error) {
      this.logger.error('Failed to find all settings', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find all settings', 'read', 'settings');
    }
  }

  async create(key: string, value: string, description?: string): Promise<SettingsEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();

      const setting: SettingsEntity = {
        id,
        key,
        value,
        description,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        description: setting.description || null,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO settings (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('Setting created', { settingKey: key });
      return setting;
    } catch (error) {
      this.logger.error('Failed to create setting', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create setting', 'create', 'settings');
    }
  }

  async update(key: string, value: string, description?: string): Promise<SettingsEntity> {
    try {
      const now = DatabaseUtils.getCurrentTimestamp();
      const existing = await this.findByKey(key);

      if (!existing) {
        throw this.errorHandler.createValidationError(`Setting with key "${key}" not found`, 'key');
      }

      const updateData: any = {
        value,
        updated_at: now
      };

      if (description !== undefined) {
        updateData.description = description;
      }

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      values.push(key);

      await DatabaseUtils.executeQuery(
        `UPDATE settings SET ${set} WHERE key = ?`,
        values
      );

      this.logger.debug('Setting updated', { settingKey: key });
      return {
        ...existing,
        value,
        description: description !== undefined ? description : existing.description,
        updatedAt: new Date(now)
      };
    } catch (error) {
      this.logger.error('Failed to update setting', error as Error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw this.errorHandler.createDatabaseError('Failed to update setting', 'update', 'settings');
    }
  }

  async upsert(key: string, value: string, description?: string): Promise<SettingsEntity> {
    try {
      const existing = await this.findByKey(key);
      if (existing) {
        return this.update(key, value, description);
      } else {
        return this.create(key, value, description);
      }
    } catch (error) {
      this.logger.error('Failed to upsert setting', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to upsert setting', 'update', 'settings');
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM settings WHERE key = ?',
        [key]
      );

      const deleted = (result as any).changes > 0;
      if (deleted) {
        this.logger.debug('Setting deleted', { settingKey: key });
      }
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete setting', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to delete setting', 'delete', 'settings');
    }
  }

  private mapToSettingsEntity(row: {
    id: string;
    key: string;
    value: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  }): SettingsEntity {
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

