import { IFileRepository, FileEntity, CreateFileData } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class FileRepository implements IFileRepository {
  private logger = getLogger('FileRepository');
  private errorHandler = getErrorHandler();

  async create(fileData: CreateFileData, userId?: string, accessType: string = 'private'): Promise<FileEntity> {
    try {
      const id = DatabaseUtils.generateId();
      const now = DatabaseUtils.getCurrentTimestamp();
      // Files within a public folder must be public
      let effectiveAccessType = accessType;
      if (fileData.folderId) {
        const parentFolder = await DatabaseUtils.findOne<any>(
          'SELECT is_public FROM folders WHERE id = ?',
          [fileData.folderId]
        );
        if (parentFolder && (parentFolder.is_public ?? 0) === 1) {
          effectiveAccessType = 'public';
        }
      }
      
      const file: FileEntity = {
        id,
        filename: fileData.filename,
        originalName: fileData.originalName,
        filePath: fileData.filePath,
        thumbnailPath: fileData.thumbnailPath,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        folderId: fileData.folderId,
        userId,
        accessType: effectiveAccessType as any,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      const { columns, placeholders, values } = DatabaseUtils.buildInsertValues({
        id: file.id,
        filename: file.filename,
        original_name: file.originalName,
        file_path: file.filePath,
        thumbnail_path: file.thumbnailPath ?? null,
        file_size: file.fileSize,
        mime_type: file.mimeType,
        folder_id: file.folderId ?? null,
        user_id: file.userId ?? null,
        access_type: file.accessType || 'private',
        created_at: now,
        updated_at: now
      });

      await DatabaseUtils.executeQuery(
        `INSERT INTO files (${columns}) VALUES (${placeholders})`,
        values
      );

      this.logger.debug('File created', { fileId: id, userId });
      return file;
    } catch (error) {
      this.logger.error('Failed to create file', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to create file', 'create', 'files');
    }
  }

  async findById(id: string): Promise<FileEntity | null> {
    try {
      const file = await DatabaseUtils.findOne<any>(
        'SELECT * FROM files WHERE id = ?',
        [id]
      );

      if (!file) {
        return null;
      }

      return this.mapToFileEntity(file);
    } catch (error) {
      this.logger.error('Failed to find file by id', error as Error, { fileId: id });
      throw this.errorHandler.createDatabaseError('Failed to find file by id', 'select', 'files');
    }
  }

  async findByFolder(folderId: string | null): Promise<FileEntity[]> {
    try {
      let query: string;
      let params: any[];

      if (folderId === null) {
        // Query for root files (folder_id IS NULL)
        query = 'SELECT * FROM files WHERE folder_id IS NULL ORDER BY created_at DESC';
        params = [];
      } else {
        // Query for files in specific folder
        query = 'SELECT * FROM files WHERE folder_id = ? ORDER BY created_at DESC';
        params = [folderId];
      }

      const files = await DatabaseUtils.findMany<any>(query, params);
      return files.map(file => this.mapToFileEntity(file));
    } catch (error) {
      this.logger.error('Failed to find files by folder', error as Error, { folderId });
      throw this.errorHandler.createDatabaseError('Failed to find files by folder', 'select', 'files');
    }
  }

  async update(id: string, data: Partial<FileEntity>): Promise<FileEntity> {
    try {
      // Map camelCase entity fields to snake_case DB columns
      const mapped: any = {};
      if (data.filename !== undefined) mapped.filename = data.filename;
      if (data.originalName !== undefined) mapped.original_name = data.originalName;
      if (data.filePath !== undefined) mapped.file_path = data.filePath;
      if (data.thumbnailPath !== undefined) mapped.thumbnail_path = data.thumbnailPath;
      if (data.fileSize !== undefined) mapped.file_size = data.fileSize;
      if (data.mimeType !== undefined) mapped.mime_type = data.mimeType;
      if (data.folderId !== undefined) mapped.folder_id = data.folderId;
      if (data.userId !== undefined) mapped.user_id = data.userId;
      if (data.accessType !== undefined) mapped.access_type = data.accessType;

      const updateData = {
        ...mapped,
        updated_at: DatabaseUtils.getCurrentTimestamp()
      };

      const { set, values } = DatabaseUtils.buildUpdateSet(updateData);
      const params = [...values, id];

      await DatabaseUtils.executeQuery(
        `UPDATE files SET ${set} WHERE id = ?`,
        params
      );

      const updatedFile = await this.findById(id);
      if (!updatedFile) {
        throw new Error('File not found after update');
      }

      this.logger.debug('File updated', { fileId: id });
      return updatedFile;
    } catch (error) {
      this.logger.error('Failed to update file', error as Error, { fileId: id });
      throw this.errorHandler.createDatabaseError('Failed to update file', 'update', 'files');
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await DatabaseUtils.executeQuery(
        'DELETE FROM files WHERE id = ?',
        [id]
      );
      const changeRow = await DatabaseUtils.findOne<any>('SELECT changes() AS changes');
      const deleted = (changeRow?.changes ?? 0) > 0;
      this.logger.debug('File delete attempt', { fileId: id, deleted });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to delete file', error as Error, { fileId: id });
      throw this.errorHandler.createDatabaseError('Failed to delete file', 'delete', 'files');
    }
  }

  async search(query: string): Promise<FileEntity[]> {
    try {
      const files = await DatabaseUtils.findMany<any>(
        'SELECT * FROM files WHERE original_name LIKE ? OR filename LIKE ? ORDER BY created_at DESC',
        [`%${query}%`, `%${query}%`]
      );
      return files.map(file => this.mapToFileEntity(file));
    } catch (error) {
      this.logger.error('Failed to search files', error as Error, { query });
      throw this.errorHandler.createDatabaseError('Failed to search files', 'select', 'files');
    }
  }

  private mapToFileEntity(dbFile: any): FileEntity {
    return {
      id: dbFile.id,
      filename: dbFile.filename,
      originalName: dbFile.original_name,
      filePath: dbFile.file_path,
      thumbnailPath: dbFile.thumbnail_path,
      fileSize: dbFile.file_size,
      mimeType: dbFile.mime_type,
      folderId: dbFile.folder_id,
      userId: dbFile.user_id,
      accessType: dbFile.access_type,
      createdAt: new Date(dbFile.created_at),
      updatedAt: new Date(dbFile.updated_at)
    };
  }
}