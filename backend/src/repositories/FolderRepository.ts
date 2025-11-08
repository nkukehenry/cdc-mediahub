import { IFolderRepository, FolderEntity, CreateFolderData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class FolderRepository implements IFolderRepository {
  private logger = getLogger('FolderRepository');
  private errorHandler = getErrorHandler();

  async create(folderData: CreateFolderData): Promise<FolderEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      const dataWithOwner = folderData as any;
      // Inherit public flag from parent if parent is public
      let isPublic = 0;
      if (folderData.parentId) {
        const parent = await DatabaseUtils.findOne<any>(
          'SELECT is_public FROM folders WHERE id = ?',
          [folderData.parentId]
        );
        if (parent && (parent.is_public ?? 0) === 1) {
          isPublic = 1;
        }
      }
      
      const folder: FolderEntity = {
        id,
        name: folderData.name,
        parentId: folderData.parentId,
        userId: dataWithOwner.userId,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: folder.id,
        name: folder.name,
        parent_id: folder.parentId ?? null,
        user_id: folder.userId ?? null,
        is_public: isPublic,
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO folders (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('Folder created', { folderId: id });
      return folder;
    } catch (error) {
      this.logger.error('Failed to create folder', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create folder', 'create', 'folders');
    }
  }

  async findById(id: string): Promise<FolderEntity | null> {
    try {
      const folder = await DatabaseUtils.findOne<any>(
        'SELECT * FROM folders WHERE id = ?',
        [id]
      );

      if (!folder) {
        return null;
      }

      return this.mapToFolderEntity(folder);
    } catch (error) {
      this.logger.error('Failed to find folder by id', error as Error, { folderId: id });
      throw this.errorHandler.createDatabaseError('Failed to find folder by id', 'select', 'folders');
    }
  }

  async findByParent(parentId: string | null): Promise<FolderEntity[]> {
    try {
      let query: string;
      let params: any[];

      if (parentId === null || parentId === undefined) {
        // Query for root folders (parent_id IS NULL OR parent_id = '')
        // Ensure 'Public' folder is always at the top
        query = `SELECT * FROM folders 
                 WHERE (parent_id IS NULL OR parent_id = ?)
                 ORDER BY CASE WHEN name = 'Public' THEN 0 ELSE 1 END, name`;
        params = [''];
      } else {
        // Query for subfolders
        query = 'SELECT * FROM folders WHERE parent_id = ? ORDER BY name';
        params = [parentId];
      }

      const folders = await DatabaseUtils.findMany<any>(query, params);
      return folders.map(folder => this.mapToFolderEntity(folder));
    } catch (error) {
      this.logger.error('Failed to find folders by parent', error as Error, { parentId });
      throw this.errorHandler.createDatabaseError('Failed to find folders by parent', 'select', 'folders');
    }
  }

  // Find folders accessible to a user (owned by user OR shared with user)
  async findByParentForUser(parentId: string | null, userId: string): Promise<FolderEntity[]> {
    try {
      let query: string;
      let params: any[];

      if (parentId === null || parentId === undefined) {
        // Query for root folders: owned by user OR shared with user OR public
        // Ensure 'Public' folder is always at the top
        query = `SELECT DISTINCT f.* FROM folders f
                 LEFT JOIN folder_shares fs ON f.id = fs.folder_id AND fs.shared_with_user_id = ?
                 WHERE (f.parent_id IS NULL)
                 AND (f.user_id = ? OR fs.shared_with_user_id = ? OR IFNULL(f.is_public, 0) = 1)
                 ORDER BY CASE WHEN f.name = 'Public' THEN 0 ELSE 1 END, f.name`;
        params = [userId, userId, userId];
      } else {
        // Query for subfolders: owned by user OR shared with user OR public
        query = `SELECT DISTINCT f.* FROM folders f
                 LEFT JOIN folder_shares fs ON f.id = fs.folder_id AND fs.shared_with_user_id = ?
                 WHERE f.parent_id = ? 
                 AND (f.user_id = ? OR fs.shared_with_user_id = ? OR IFNULL(f.is_public, 0) = 1)
                 ORDER BY f.name`;
        params = [userId, parentId, userId, userId];
      }

      const folders = await DatabaseUtils.findMany<any>(query, params);
      return folders.map(folder => this.mapToFolderEntity(folder));
    } catch (error) {
      this.logger.error('Failed to find folders by parent for user', error as Error, { parentId, userId });
      throw this.errorHandler.createDatabaseError('Failed to find folders by parent for user', 'select', 'folders');
    }
  }

  async update(id: string, data: Partial<FolderEntity>): Promise<FolderEntity> {
    try {
      const updateData = {
        ...data,
        updated_at: DatabaseUtils.getCurrentTimestamp()
      };

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE folders SET ${set} WHERE id = ?`,
        params
      );

      const updatedFolder = await this.findById(id);
      if (!updatedFolder) {
        throw new Error('Folder not found after update');
      }

      this.logger.debug('Folder updated', { folderId: id });
      return updatedFolder;
    } catch (error) {
      this.logger.error('Failed to update folder', error as Error, { folderId: id });
      throw this.errorHandler.createDatabaseError('Failed to update folder', 'update', 'folders');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Check if folder has children or files
      const children = await DatabaseUtils.findMany<any>(
        'SELECT id FROM folders WHERE parent_id = ?',
        [id]
      );

      const files = await DatabaseUtils.findMany<any>(
        'SELECT id FROM files WHERE folder_id = ?',
        [id]
      );

      if (children.length > 0 || files.length > 0) {
        throw new Error('Cannot delete folder with children or files');
      }

      const result = await DatabaseUtils.executeQuery(
        'DELETE FROM folders WHERE id = ?',
        [id]
      );

      const deleted = result.changes > 0;
      this.logger.debug('Folder delete attempt', { folderId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete folder', error as Error, { folderId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete folder', 'delete', 'folders');
    }
  }

  private mapToFolderEntity(dbFolder: any): FolderEntity {
    return {
      id: dbFolder.id,
      name: dbFolder.name,
      parentId: dbFolder.parent_id,
      userId: dbFolder.user_id,
      createdAt: new Date(dbFolder.created_at),
      updatedAt: new Date(dbFolder.updated_at)
    };
  }
}