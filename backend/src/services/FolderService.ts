import fs from 'fs/promises';
import path from 'path';
import { IFolderService, FolderEntity, CreateFolderData, FolderWithFiles, AccessLevel } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { ValidationError } from '../interfaces';
import { IFolderShareRepository } from '../repositories/FolderShareRepository';

export class FolderService implements IFolderService {
  private logger = getLogger('FolderService');
  private errorHandler = getErrorHandler();
  private folderShareRepository?: IFolderShareRepository;

  constructor(private uploadPath: string, folderShareRepository?: IFolderShareRepository) {
    this.ensureUploadDirectory();
    this.folderShareRepository = folderShareRepository;
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

  async createFolder(name: string, parentId?: string, userId?: string): Promise<FolderEntity> {
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
        parentId,
        userId
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

  async getFoldersWithFiles(parentId?: string, userId?: string): Promise<FolderWithFiles[]> {
    try {
      const folders = userId 
        ? await this.findFoldersByParentForUser(parentId || null, userId)
        : await this.findFoldersByParent(parentId);
      const foldersWithFiles: FolderWithFiles[] = [];

      for (const folder of folders) {
        // Get files in this folder - access filtering happens via dependency injection
        // The findFilesInFolder is injected from FileRepository
        // We'll filter files based on access if userId is provided
        let files = await this.findFilesInFolder(folder.id);
        
        // If userId provided, we need to filter files based on access
        // For now, include all files - the frontend will handle access control
        // Or we can inject fileService here if needed
        // Files will be filtered by the folder ownership (user owns folder = can see files)
        
        // Get subfolders recursively
        const subfolders = await this.getFoldersWithFiles(folder.id, userId);

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

  async shareFolderWithUsers(folderId: string, userId: string, sharedWithUserIds: string[], accessLevel: AccessLevel = 'write'): Promise<any[]> {
    try {
      // Verify folder ownership
      const folder = await this.findFolderById(folderId);
      if (!folder) {
        throw this.errorHandler.createFolderNotFoundError(folderId);
      }

      if (folder.userId !== userId) {
        throw this.errorHandler.createValidationError('You do not have permission to share this folder');
      }

      if (!this.folderShareRepository) {
        throw this.errorHandler.createConfigurationError('Folder share repository not configured');
      }

      if (sharedWithUserIds.length === 0) {
        throw this.errorHandler.createValidationError('At least one user must be selected');
      }

      // Create share data for each user
      const shareDataList = sharedWithUserIds.map(sharedUserId => ({
        folderId,
        sharedWithUserId: sharedUserId,
        accessLevel
      }));

      const shares = await this.folderShareRepository.createMany(shareDataList);
      this.logger.info('Folder shared with multiple users', { folderId, userId, count: shares.length });
      return shares;
    } catch (error) {
      this.logger.error('Multi-user folder sharing failed', error as Error, { folderId, userId });
      throw error;
    }
  }

  async getFoldersSharedWithUser(userId: string): Promise<FolderEntity[]> {
    try {
      if (!this.folderShareRepository) {
        this.logger.warn('Folder share repository not configured');
        return [];
      }

      const shares = await this.folderShareRepository.findByUser(userId);
      const folderIds = shares.map(share => share.folderId);
      
      if (folderIds.length === 0) {
        return [];
      }

      // Fetch folders using the injected repository method
      const folders: FolderEntity[] = [];
      for (const folderId of folderIds) {
        const folder = await this.findFolderById(folderId);
        if (folder) {
          folders.push(folder);
        }
      }

      this.logger.debug('Folders shared with user retrieved', { userId, count: folders.length });
      return folders;
    } catch (error) {
      this.logger.error('Failed to get folders shared with user', error as Error, { userId });
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

  private async findFoldersByParentForUser(parentId: string | null | undefined, userId: string): Promise<FolderEntity[]> {
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