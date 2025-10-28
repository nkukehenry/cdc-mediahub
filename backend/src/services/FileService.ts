import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { IFileService, FileEntity, CreateFileData } from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { UploadError, ThumbnailError, ValidationError } from '../interfaces';

export class FileService implements IFileService {
  private logger = getLogger('FileService');
  private errorHandler = getErrorHandler();

  constructor(
    private uploadPath: string,
    private thumbnailPath: string,
    private maxFileSize: number,
    private allowedMimeTypes: string[]
  ) {
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      await fs.mkdir(this.thumbnailPath, { recursive: true });
      this.logger.debug('Upload directories ensured', { uploadPath: this.uploadPath, thumbnailPath: this.thumbnailPath });
    } catch (error) {
      this.logger.error('Failed to create upload directories', error as Error);
      throw this.errorHandler.createConfigurationError('Failed to create upload directories');
    }
  }

  async upload(file: Express.Multer.File, folderId?: string): Promise<FileEntity> {
    try {
      this.validateFile(file);

      const fileId = uuidv4();
      const fileExtension = this.getFileExtension(file.originalname);
      const filename = `${fileId}${fileExtension}`;
      
      // Determine the correct file path based on folder
      let filePath: string;
      if (folderId) {
        // Store file inside the folder directory
        const folderPath = path.join(this.uploadPath, folderId);
        await fs.mkdir(folderPath, { recursive: true }); // Ensure folder exists
        filePath = path.join(folderPath, filename);
      } else {
        // Store file in root uploads directory
        filePath = path.join(this.uploadPath, filename);
      }

      await this.saveFile(file.buffer, filePath);

      const thumbnailPath = await this.generateThumbnail(filePath, file.mimetype);

      const fileData: CreateFileData = {
        filename,
        originalName: file.originalname,
        filePath,
        thumbnailPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        folderId
      };

      // This would be injected from the repository
      const savedFile = await this.saveFileToDatabase(fileData);

      this.logger.info('File uploaded successfully', { 
        fileId: savedFile.id, 
        originalName: file.originalname,
        fileSize: file.size 
      });

      return savedFile;
    } catch (error) {
      this.logger.error('File upload failed', error as Error, { originalName: file.originalname });
      throw error;
    }
  }

  async download(id: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    try {
      const file = await this.findFileById(id);
      if (!file) {
        throw this.errorHandler.createFileNotFoundError(id);
      }

      // Check if file exists on disk
      await this.checkFileExists(file.filePath);

      this.logger.debug('File download requested', { fileId: id });
      return {
        filePath: file.filePath,
        fileName: file.originalName,
        mimeType: file.mimeType
      };
    } catch (error) {
      this.logger.error('File download failed', error as Error, { fileId: id });
      throw error;
    }
  }

  async generateThumbnail(filePath: string, mimeType: string): Promise<string> {
    try {
      if (!this.isImageFile(mimeType)) {
        return '';
      }

      const filename = path.basename(filePath);
      const thumbnailFilename = `thumb_${filename}`;
      const thumbnailPath = path.join(this.thumbnailPath, thumbnailFilename);

      await sharp(filePath)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      this.logger.debug('Thumbnail generated', { filePath, thumbnailPath });
      return thumbnailPath;
    } catch (error) {
      this.logger.error('Thumbnail generation failed', error as Error, { filePath });
      throw this.errorHandler.createThumbnailError('Failed to generate thumbnail', filePath);
    }
  }

  async deleteFile(id: string): Promise<boolean> {
    try {
      const file = await this.findFileById(id);
      if (!file) {
        throw this.errorHandler.createFileNotFoundError(id);
      }

      // Delete physical files
      await this.deletePhysicalFile(file.filePath);
      if (file.thumbnailPath) {
        await this.deletePhysicalFile(file.thumbnailPath);
      }

      // Delete from database
      const deleted = await this.deleteFileFromDatabase(id);

      this.logger.info('File deleted successfully', { fileId: id });
      return deleted;
    } catch (error) {
      this.logger.error('File deletion failed', error as Error, { fileId: id });
      throw error;
    }
  }

  async getFiles(folderId: string | null): Promise<FileEntity[]> {
    try {
      const files = await this.findFilesByFolder(folderId);
      this.logger.debug('Files retrieved', { folderId, count: files.length });
      return files;
    } catch (error) {
      this.logger.error('Failed to get files', error as Error, { folderId });
      throw error;
    }
  }

  async searchFiles(query: string): Promise<FileEntity[]> {
    try {
      const files = await this.searchFilesInDatabase(query);
      this.logger.debug('Files searched', { query, count: files.length });
      return files;
    } catch (error) {
      this.logger.error('File search failed', error as Error, { query });
      throw error;
    }
  }

  // Small, reusable utility functions
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw this.errorHandler.createValidationError('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw this.errorHandler.createValidationError(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
        'fileSize',
        file.size
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw this.errorHandler.createValidationError(
        `File type ${file.mimetype} is not allowed`,
        'mimeType',
        file.mimetype
      );
    }
  }

  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  private async saveFile(buffer: Buffer, filePath: string): Promise<void> {
    await fs.writeFile(filePath, buffer);
  }

  private async deletePhysicalFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, log but don't throw
      this.logger.warn('Failed to delete physical file', { filePath });
    }
  }

  private async checkFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw this.errorHandler.createFileNotFoundError('file');
    }
  }

  private isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  // These would be injected from repositories
  private async saveFileToDatabase(fileData: CreateFileData): Promise<FileEntity> {
    throw new Error('FileRepository not injected');
  }

  private async findFileById(id: string): Promise<FileEntity | null> {
    throw new Error('FileRepository not injected');
  }

  private async findFilesByFolder(folderId: string | null): Promise<FileEntity[]> {
    throw new Error('FileRepository not injected');
  }

  private async searchFilesInDatabase(query: string): Promise<FileEntity[]> {
    throw new Error('FileRepository not injected');
  }

  private async deleteFileFromDatabase(id: string): Promise<boolean> {
    throw new Error('FileRepository not injected');
  }
}