import { IFileShareRepository, FileShareEntity, ShareFileData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class FileShareRepository implements IFileShareRepository {
  private logger = getLogger('FileShareRepository');
  private errorHandler = getErrorHandler();

  async create(shareData: ShareFileData): Promise<FileShareEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      
      const share: FileShareEntity = {
        id,
        fileId: shareData.fileId,
        sharedWithUserId: shareData.sharedWithUserId,
        accessLevel: shareData.accessLevel || 'read',
        createdAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: share.id,
        file_id: share.fileId,
        shared_with_user_id: share.sharedWithUserId,
        access_level: share.accessLevel,
        created_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO file_shares (${columns}) VALUES (${placeholders})`,
        values
      );

      // Update file access_type to 'shared' or 'public'
      const accessType = shareData.sharedWithUserId ? 'shared' : 'public';
      await DatabaseUtils.executeQuery(
        'UPDATE files SET access_type = ? WHERE id = ?',
        [accessType, shareData.fileId]
      );

      this.logger.debug('File share created', { shareId: id, fileId: shareData.fileId });
      return share;
    } catch (error) {
      this.logger.error('Failed to create file share', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create file share', 'create', 'file_shares');
    }
  }

  // Share file with multiple users at once
  async createMany(shareDataList: ShareFileData[]): Promise<FileShareEntity[]> {
    try {
      if (shareDataList.length === 0) {
        return [];
      }

      const shares: FileShareEntity[] = [];
      const now = DatabaseUtils.getCurrentTimestamp();
      const fileId = shareDataList[0].fileId;

      // Create shares for each user
      for (const shareData of shareDataList) {
        // Check if share already exists
        const existing = await DatabaseUtils.findOne<any>(
          'SELECT * FROM file_shares WHERE file_id = ? AND shared_with_user_id = ?',
          [shareData.fileId, shareData.sharedWithUserId]
        );

        if (existing) {
          // Update existing share access level
          await DatabaseUtils.executeQuery(
            'UPDATE file_shares SET access_level = ? WHERE id = ?',
            [shareData.accessLevel || 'read', existing.id]
          );
          shares.push(this.mapToFileShareEntity(existing));
          continue;
        }

        const id = DatabaseUtils.generateId();
        const share: FileShareEntity = {
          id,
          fileId: shareData.fileId,
          sharedWithUserId: shareData.sharedWithUserId,
          accessLevel: shareData.accessLevel || 'read',
          createdAt: new Date(now)
        };

        const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
          id: share.id,
          file_id: share.fileId,
          shared_with_user_id: share.sharedWithUserId,
          access_level: share.accessLevel,
          created_at: now
        });

        await DatabaseUtils.executeQuery(
          `INSERT INTO file_shares (${columns}) VALUES (${placeholders})`,
          values
        );

        shares.push(share);
      }

      // Update file access_type to 'shared'
      await DatabaseUtils.executeQuery(
        'UPDATE files SET access_type = ? WHERE id = ?',
        ['shared', fileId]
      );

      this.logger.debug('Multiple file shares created', { count: shares.length, fileId });
      return shares;
    } catch (error) {
      this.logger.error('Failed to create multiple file shares', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create multiple file shares', 'create', 'file_shares');
    }
  }

  async findByFile(fileId: string): Promise<FileShareEntity[]> {
    try {
      const shares = await DatabaseUtils.findMany<any>(
        'SELECT * FROM file_shares WHERE file_id = ?',
        [fileId]
      );
      return shares.map(share => this.mapToFileShareEntity(share));
    } catch (error) {
      this.logger.error('Failed to find file shares by file', error as Error, { fileId });
      throw this.errorHandler.createDatabaseError('Failed to find file shares by file', 'select', 'file_shares');
    }
  }

  async findByUser(userId: string): Promise<FileShareEntity[]> {
    try {
      const shares = await DatabaseUtils.findMany<any>(
        'SELECT * FROM file_shares WHERE shared_with_user_id = ?',
        [userId]
      );
      return shares.map(share => this.mapToFileShareEntity(share));
    } catch (error) {
      this.logger.error('Failed to find file shares by user', error as Error, { userId });
      throw this.errorHandler.createDatabaseError('Failed to find file shares by user', 'select', 'file_shares');
    }
  }

  async findPublicFiles(): Promise<string[]> {
    try {
      // Get files that are marked as public in file_shares (where shared_with_user_id IS NULL)
      const files = await DatabaseUtils.findMany<any>(
        'SELECT DISTINCT file_id FROM file_shares WHERE shared_with_user_id IS NULL'
      );
      
      // Also get files marked as public in files table
      const publicFiles = await DatabaseUtils.findMany<any>(
        'SELECT id FROM files WHERE access_type = ?',
        ['public']
      );

      const allFileIds = new Set<string>();
      files.forEach((f: any) => allFileIds.add(f.file_id));
      publicFiles.forEach((f: any) => allFileIds.add(f.id));

      return Array.from(allFileIds);
    } catch (error) {
      this.logger.error('Failed to find public files', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to find public files', 'select', 'file_shares');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Get the share to find the file_id
      const share = await DatabaseUtils.findOne<any>(
        'SELECT * FROM file_shares WHERE id = ?',
        [id]
      );

      await DatabaseUtils.executeQuery(
        'DELETE FROM file_shares WHERE id = ?',
        [id]
      );
      const changeRow = await DatabaseUtils.findOne<any>('SELECT changes() AS changes');
      const deleted = (changeRow?.changes ?? 0) > 0;

      // If deleted, check if file should revert to private
      if (deleted && share) {
        const remainingShares = await DatabaseUtils.findMany<any>(
          'SELECT * FROM file_shares WHERE file_id = ?',
          [share.file_id]
        );

        // If no shares remain, set file to private
        if (remainingShares.length === 0) {
          await DatabaseUtils.executeQuery(
            'UPDATE files SET access_type = ? WHERE id = ?',
            ['private', share.file_id]
          );
        }
      }

      this.logger.debug('File share delete attempt', { shareId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete file share', error as Error, { shareId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete file share', 'delete', 'file_shares');
    }
  }

  async deleteByFile(fileId: string): Promise<boolean> {
    try {
      await DatabaseUtils.executeQuery(
        'DELETE FROM file_shares WHERE file_id = ?',
        [fileId]
      );

      // Set file back to private
      await DatabaseUtils.executeQuery(
        'UPDATE files SET access_type = ? WHERE id = ?',
        ['private', fileId]
      );

      const changeRow2 = await DatabaseUtils.findOne<any>('SELECT changes() AS changes');
      const deleted = (changeRow2?.changes ?? 0) > 0;
      this.logger.debug('File shares deleted by file', { fileId, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete file shares by file', error as Error, { fileId });
      throw this.errorHandler.createDatabaseError('Failed to delete file shares by file', 'delete', 'file_shares');
    }
  }

  // Delete specific share for a file and user
  async deleteByFileAndUser(fileId: string, userId: string): Promise<boolean> {
    try {
      await DatabaseUtils.executeQuery(
        'DELETE FROM file_shares WHERE file_id = ? AND shared_with_user_id = ?',
        [fileId, userId]
      );

      // Check if any shares remain for this file
      const remainingShares = await DatabaseUtils.findMany<any>(
        'SELECT * FROM file_shares WHERE file_id = ?',
        [fileId]
      );

      // If no shares remain, set file back to private
      if (remainingShares.length === 0) {
        await DatabaseUtils.executeQuery(
          'UPDATE files SET access_type = ? WHERE id = ?',
          ['private', fileId]
        );
      }

      const changeRow3 = await DatabaseUtils.findOne<any>('SELECT changes() AS changes');
      const deleted = (changeRow3?.changes ?? 0) > 0;
      this.logger.debug('File share deleted by file and user', { fileId, userId, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete file share by file and user', error as Error, { fileId, userId });
      throw this.errorHandler.createDatabaseError('Failed to delete file share by file and user', 'delete', 'file_shares');
    }
  }

  async checkAccess(fileId: string, userId?: string): Promise<boolean> {
    try {
      // Do NOT grant access based on public flag; only owner or explicit share
      const file = await DatabaseUtils.findOne<any>(
        'SELECT access_type, user_id FROM files WHERE id = ?',
        [fileId]
      );

      if (!file) {
        return false;
      }

      // Owner always has access
      if (userId && file.user_id === userId) {
        return true;
      }

      // Ignore public access here

      // Check if shared with specific user
      if (userId) {
        const userShare = await DatabaseUtils.findOne<any>(
          'SELECT * FROM file_shares WHERE file_id = ? AND shared_with_user_id = ?',
          [fileId, userId]
        );

        if (userShare) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check file access', error as Error, { fileId, userId });
      throw this.errorHandler.createDatabaseError('Failed to check file access', 'select', 'file_shares');
    }
  }

  private mapToFileShareEntity(dbShare: any): FileShareEntity {
    return {
      id: dbShare.id,
      fileId: dbShare.file_id,
      sharedWithUserId: dbShare.shared_with_user_id,
      accessLevel: dbShare.access_level,
      createdAt: new Date(dbShare.created_at)
    };
  }
}

