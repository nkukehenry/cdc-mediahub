import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { AccessLevel } from '../interfaces';

export interface FolderShareEntity {
  id: string;
  folderId: string;
  sharedWithUserId?: string;
  accessLevel: AccessLevel;
  createdAt: Date;
}

export interface ShareFolderData {
  folderId: string;
  sharedWithUserId: string;
  accessLevel?: AccessLevel;
}

export interface IFolderShareRepository {
  create(shareData: ShareFolderData): Promise<FolderShareEntity>;
  createMany(shareDataList: ShareFolderData[]): Promise<FolderShareEntity[]>;
  findByFolder(folderId: string): Promise<FolderShareEntity[]>;
  findByUser(userId: string): Promise<FolderShareEntity[]>;
  delete(id: string): Promise<boolean>;
  deleteByFolder(folderId: string): Promise<boolean>;
  deleteByFolderAndUser(folderId: string, userId: string): Promise<boolean>;
  checkAccess(folderId: string, userId?: string): Promise<boolean>;
}

export class FolderShareRepository implements IFolderShareRepository {
  private logger = getLogger('FolderShareRepository');
  private errorHandler = getErrorHandler();

  async create(shareData: ShareFolderData): Promise<FolderShareEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const share: FolderShareEntity = {
        id,
        folderId: shareData.folderId,
        sharedWithUserId: shareData.sharedWithUserId,
        accessLevel: shareData.accessLevel || 'write',
        createdAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: share.id,
        folder_id: share.folderId,
        shared_with_user_id: share.sharedWithUserId,
        access_level: share.accessLevel,
        created_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO folder_shares (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('Folder share created', { shareId: id, folderId: shareData.folderId });
      return share;
    } catch (error) {
      this.logger.error('Failed to create folder share', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create folder share', 'create', 'folder_shares');
    }
  }

  // Share folder with multiple users at once
  async createMany(shareDataList: ShareFolderData[]): Promise<FolderShareEntity[]> {
    try {
      if (shareDataList.length === 0) {
        return [];
      }

      const shares: FolderShareEntity[] = [];
      const now = DatabaseUtils.getCurrentTimestamp();
      const folderId = shareDataList[0].folderId;

      // Create shares for each user
      for (const shareData of shareDataList) {
        // Check if share already exists
        const existing = await DatabaseUtils.findOne<any>(
          'SELECT * FROM folder_shares WHERE folder_id = ? AND shared_with_user_id = ?',
          [shareData.folderId, shareData.sharedWithUserId]
        );

        if (existing) {
          // Update existing share access level
          await DatabaseUtils.executeQuery(
            'UPDATE folder_shares SET access_level = ? WHERE id = ?',
            [shareData.accessLevel || 'write', existing.id]
          );
          shares.push(this.mapToFolderShareEntity(existing));
          continue;
        }

        const id = DatabaseUtils.generateId();
        const share: FolderShareEntity = {
          id,
          folderId: shareData.folderId,
          sharedWithUserId: shareData.sharedWithUserId,
          accessLevel: shareData.accessLevel || 'write',
          createdAt: new Date(now)
        };

        const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
          id: share.id,
          folder_id: share.folderId,
          shared_with_user_id: share.sharedWithUserId,
          access_level: share.accessLevel,
          created_at: now
        });

        await DatabaseUtils.executeQuery(
          `INSERT INTO folder_shares (${columns}) VALUES (${placeholders})`,
          values
        );

        shares.push(share);
      }

      this.logger.debug('Multiple folder shares created', { count: shares.length, folderId });
      return shares;
    } catch (error) {
      this.logger.error('Failed to create multiple folder shares', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create multiple folder shares', 'create', 'folder_shares');
    }
  }

  async findByFolder(folderId: string): Promise<FolderShareEntity[]> {
    try {
      const shares = await DatabaseUtils.findMany<any>(
        'SELECT * FROM folder_shares WHERE folder_id = ?',
        [folderId]
      );
      return shares.map(share => this.mapToFolderShareEntity(share));
    } catch (error) {
      this.logger.error('Failed to find folder shares by folder', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find folder shares by folder', 'select', 'folder_shares');
    }
  }

  async findByUser(userId: string): Promise<FolderShareEntity[]> {
    try {
      const shares = await DatabaseUtils.findMany<any>(
        'SELECT * FROM folder_shares WHERE shared_with_user_id = ?',
        [userId]
      );
      return shares.map(share => this.mapToFolderShareEntity(share));
    } catch (error) {
      this.logger.error('Failed to find folder shares by user', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find folder shares by user', 'select', 'folder_shares');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const share = await DatabaseUtils.findOne<any>(
        'SELECT * FROM folder_shares WHERE id = ?',
        [id]
      );

      if (!share) {
        return false;
      }

      await DatabaseUtils.executeQuery(
        'DELETE FROM folder_shares WHERE id = ?',
        [id]
      );

      this.logger.debug('Folder share deleted', { shareId: id });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete folder share', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to delete folder share', 'delete', 'folder_shares');
    }
  }

  async deleteByFolder(folderId: string): Promise<boolean> {
    try {
      const shares = await DatabaseUtils.findMany<any>(
        'SELECT * FROM folder_shares WHERE folder_id = ?',
        [folderId]
      );

      if (shares.length === 0) {
        return false;
      }

      await DatabaseUtils.executeQuery(
        'DELETE FROM folder_shares WHERE folder_id = ?',
        [folderId]
      );

      this.logger.debug('Folder shares deleted by folder', { folderId, count: shares.length });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete folder shares by folder', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to delete folder shares by folder', 'delete', 'folder_shares');
    }
  }

  async deleteByFolderAndUser(folderId: string, userId: string): Promise<boolean> {
    try {
      const share = await DatabaseUtils.findOne<any>(
        'SELECT * FROM folder_shares WHERE folder_id = ? AND shared_with_user_id = ?',
        [folderId, userId]
      );

      if (!share) {
        return false;
      }

      await DatabaseUtils.executeQuery(
        'DELETE FROM folder_shares WHERE folder_id = ? AND shared_with_user_id = ?',
        [folderId, userId]
      );

      this.logger.debug('Folder share deleted by folder and user', { folderId, userId });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete folder share by folder and user', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to delete folder share by folder and user', 'delete', 'folder_shares');
    }
  }

  async checkAccess(folderId: string, userId?: string): Promise<boolean> {
    try {
      const folder = await DatabaseUtils.findOne<any>(
        'SELECT user_id FROM folders WHERE id = ?',
        [folderId]
      );

      if (!folder) {
        return false;
      }

      // Owner always has access
      if (userId && folder.user_id === userId) {
        return true;
      }

      // Check if shared with specific user
      if (userId) {
        const userShare = await DatabaseUtils.findOne<any>(
          'SELECT * FROM folder_shares WHERE folder_id = ? AND shared_with_user_id = ?',
          [folderId, userId]
        );

        if (userShare) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check folder access', error as Error, { folderId, userId });
      throw this.errorHandler.createDatabaseError('Failed to check folder access', 'select', 'folder_shares');
    }
  }

  private mapToFolderShareEntity(dbShare: any): FolderShareEntity {
    return {
      id: dbShare.id,
      folderId: dbShare.folder_id,
      sharedWithUserId: dbShare.shared_with_user_id,
      accessLevel: dbShare.access_level,
      createdAt: new Date(dbShare.created_at)
    };
  }
}

