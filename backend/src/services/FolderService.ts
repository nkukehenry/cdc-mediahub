import fs from 'fs/promises';
import path from 'path';
import { IFolderService, FolderEntity, CreateFolderData, FolderWithFiles } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { ValidationError } from '../interfaces';

export class FolderService implements IFolderService {
  private logger = getLogger('FolderService');
  private errorHandler = getErrorHandler();

  constructor(private uploadPath: string) {
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      this.logger.debug('Upload directory ensured', { uploadPath: this.uploadPath });
    } catch (error) {
      this.logger.error('Failed to create upload directory', error as Error);
      throw this.errorHandler.createConfigurationError('Failed to create upload directory');
    }
  }

  async createFolder(name: string, parentId?: string): Promise<FolderEntity> {
    try {
      this.validateFolderName(name);
      
      // Check if parent folder exists
      if (parentId) {
        await this.validateParentFolder(parentId);
      }

      // Check if folder with same name already exists in parent
      await this.checkDuplicateFolderName(name, parentId);

      const folderData: CreateFolderData = {
        name: name.trim(),
        parentId
      };

      const folder = await this.saveFolderToDatabase(folderData);

      // Create physical directory
      await this.createPhysicalDirectory(folder);

      this.logger.info('Folder created successfully', { 
        folderId: folder.id, 
        name: folder.name,
        parentId: folder.parentId,
        physicalPath: this.getFolderPath(folder)
      });

      return folder;
    } catch (error) {
      this.logger.error('Folder creation failed', error as Error, { name, parentId });
      throw error;
    }
  }

  async getFolders(parentId?: string): Promise<FolderEntity[]> {
    try {
      const folders = await this.findFoldersByParent(parentId);
      this.logger.debug('Folders retrieved', { parentId, count: folders.length });
      return folders;
    } catch (error) {
      this.logger.error('Failed to get folders', error as Error, { parentId });
      throw error;
    }
  }

  async getFoldersWithFiles(parentId?: string): Promise<FolderWithFiles[]> {
    try {
      const folders = await this.findFoldersByParent(parentId);
      const foldersWithFiles: FolderWithFiles[] = [];

      for (const folder of folders) {
        // Get files in this folder
        const files = await this.findFilesInFolder(folder.id);
        
        // Get subfolders recursively
        const subfolders = await this.getFoldersWithFiles(folder.id);

        foldersWithFiles.push({
          ...folder,
          files,
          subfolders
        });
      }

      this.logger.debug('Folders with files retrieved', { parentId, count: foldersWithFiles.length });
      return foldersWithFiles;
    } catch (error) {
      this.logger.error('Failed to get folders with files', error as Error, { parentId });
      throw error;
    }
  }

  async updateFolder(id: string, data: Partial<FolderEntity>): Promise<FolderEntity> {
    try {
      const existingFolder = await this.findFolderById(id);
      if (!existingFolder) {
        throw this.errorHandler.createFolderNotFoundError(id);
      }

      // Validate name if being updated
      if (data.name) {
        this.validateFolderName(data.name);
        await this.checkDuplicateFolderName(data.name, existingFolder.parentId, id);
      }

      const updatedFolder = await this.updateFolderInDatabase(id, data);

      this.logger.info('Folder updated successfully', { folderId: id });
      return updatedFolder;
    } catch (error) {
      this.logger.error('Folder update failed', error as Error, { folderId: id });
      throw error;
    }
  }

  async deleteFolder(id: string): Promise<boolean> {
    try {
      const folder = await this.findFolderById(id);
      if (!folder) {
        throw this.errorHandler.createFolderNotFoundError(id);
      }

      // Check if folder has children
      const children = await this.findFoldersByParent(id);
      if (children.length > 0) {
        throw this.errorHandler.createValidationError('Cannot delete folder with subfolders', 'hasChildren');
      }

      // Check if folder has files
      const files = await this.findFilesInFolder(id);
      if (files.length > 0) {
        throw this.errorHandler.createValidationError('Cannot delete folder with files', 'hasFiles');
      }

      const deleted = await this.deleteFolderFromDatabase(id);

      if (deleted) {
        // Remove physical directory
        await this.removePhysicalDirectory(folder);
      }

      this.logger.info('Folder deleted successfully', { 
        folderId: id,
        physicalPath: this.getFolderPath(folder)
      });
      return deleted;
    } catch (error) {
      this.logger.error('Folder deletion failed', error as Error, { folderId: id });
      throw error;
    }
  }

  // Small, reusable utility functions
  private validateFolderName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw this.errorHandler.createValidationError('Folder name is required', 'name');
    }

    if (name.trim().length < 1) {
      throw this.errorHandler.createValidationError('Folder name must be at least 1 character', 'name');
    }

    if (name.trim().length > 255) {
      throw this.errorHandler.createValidationError('Folder name must be less than 255 characters', 'name');
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      throw this.errorHandler.createValidationError('Folder name contains invalid characters', 'name', name);
    }
  }

  private async validateParentFolder(parentId: string): Promise<void> {
    const parentFolder = await this.findFolderById(parentId);
    if (!parentFolder) {
      throw this.errorHandler.createFolderNotFoundError(parentId);
    }
  }

  private async checkDuplicateFolderName(
    name: string, 
    parentId?: string, 
    excludeId?: string
  ): Promise<void> {
    const folders = await this.findFoldersByParent(parentId);
    const duplicate = folders.find(folder => 
      folder.name.toLowerCase() === name.toLowerCase() && folder.id !== excludeId
    );

    if (duplicate) {
      throw this.errorHandler.createValidationError(
        `Folder with name "${name}" already exists in this location`,
        'name',
        name
      );
    }
  }

  // These would be injected from repositories
  private async saveFolderToDatabase(folderData: CreateFolderData): Promise<FolderEntity> {
    throw new Error('FolderRepository not injected');
  }

  private async findFolderById(id: string): Promise<FolderEntity | null> {
    throw new Error('FolderRepository not injected');
  }

  private async findFoldersByParent(parentId?: string): Promise<FolderEntity[]> {
    throw new Error('FolderRepository not injected');
  }

  private async updateFolderInDatabase(id: string, data: Partial<FolderEntity>): Promise<FolderEntity> {
    throw new Error('FolderRepository not injected');
  }

  private async deleteFolderFromDatabase(id: string): Promise<boolean> {
    throw new Error('FolderRepository not injected');
  }

  private async findFilesInFolder(folderId: string): Promise<any[]> {
    throw new Error('FileRepository not injected');
  }

  // Physical directory management methods
  private async createPhysicalDirectory(folder: FolderEntity): Promise<void> {
    try {
      const folderPath = this.getFolderPath(folder);
      await fs.mkdir(folderPath, { recursive: true });
      this.logger.debug('Physical directory created', { folderPath });
    } catch (error) {
      this.logger.error('Failed to create physical directory', error as Error, { folderId: folder.id });
      throw this.errorHandler.createConfigurationError('Failed to create physical directory');
    }
  }

  private async removePhysicalDirectory(folder: FolderEntity): Promise<void> {
    try {
      const folderPath = this.getFolderPath(folder);
      await fs.rmdir(folderPath);
      this.logger.debug('Physical directory removed', { folderPath });
    } catch (error) {
      this.logger.warn('Failed to remove physical directory', { folderPath: this.getFolderPath(folder) });
      // Don't throw error - directory might not exist or have permissions issues
    }
  }

  private getFolderPath(folder: FolderEntity): string {
    if (folder.parentId) {
      // For subfolders, we need to get the parent path
      // This is a simplified version - in a real implementation, you'd build the full path
      return path.join(this.uploadPath, folder.id);
    } else {
      // Root folder
      return path.join(this.uploadPath, folder.id);
    }
  }

  private async getFullFolderPath(folder: FolderEntity): Promise<string> {
    if (!folder.parentId) {
      return path.join(this.uploadPath, folder.id);
    }

    // Build full path by traversing parent folders
    const parentFolder = await this.findFolderById(folder.parentId);
    if (!parentFolder) {
      throw this.errorHandler.createFolderNotFoundError(folder.parentId);
    }

    const parentPath = await this.getFullFolderPath(parentFolder);
    return path.join(parentPath, folder.id);
  }
}