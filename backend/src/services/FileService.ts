import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { IFileService, IFileShareRepository, FileEntity, CreateFileData, ShareFileData, FileShareEntity, AccessLevel } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';
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
    private allowedMimeTypes: string[],
    private fileShareRepository?: IFileShareRepository
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

  private isMimeAllowed(mimeType: string): boolean {
    if (!mimeType) return false;
    for (const allowed of this.allowedMimeTypes) {
      if (!allowed) continue;
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, allowed.length - 1); // keep trailing '/'
        if (mimeType.startsWith(prefix)) return true;
      } else if (allowed.toLowerCase() === mimeType.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  async upload(file: Express.Multer.File, userId: string, folderId?: string): Promise<FileEntity> {
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

      // This would be injected from the repository - now includes userId
      const savedFile = await this.saveFileToDatabase(fileData, userId);

      this.logger.info('File uploaded successfully', { 
        fileId: savedFile.id, 
        originalName: file.originalname,
        fileSize: file.size,
        userId
      });

      return savedFile;
    } catch (error) {
      this.logger.error('File upload failed', error as Error, { originalName: file.originalname });
      throw error;
    }
  }

  async download(id: string, userId?: string): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    try {
      const file = await this.findFileById(id);
      if (!file) {
        throw this.errorHandler.createFileNotFoundError(id);
      }

      this.logger.debug('File download requested', { fileId: id, userId, fileUserId: file.userId, fileName: file.originalName });

      // Check file access
      if (!await this.checkFileAccess(id, userId, file)) {
        this.logger.warn('File download access denied', { fileId: id, userId, fileUserId: file.userId });
        throw this.errorHandler.createValidationError('You do not have access to this file');
      }

      // Check if file exists on disk
      await this.checkFileExists(file.filePath);

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

  async extractVideoFrame(filePath: string, timestampSeconds: number = 1): Promise<string> {
    try {
      if (!await this.fileExists(filePath)) {
        throw this.errorHandler.createFileNotFoundError('video');
      }

      const filename = path.basename(filePath, path.extname(filePath));
      const thumbnailFilename = `frame_${filename}_${timestampSeconds}.jpg`;
      const thumbnailPath = path.join(this.thumbnailPath, thumbnailFilename);

      return new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            timestamps: [timestampSeconds],
            filename: thumbnailFilename,
            folder: this.thumbnailPath,
            size: '1920x1080' // Max quality, will be resized if needed
          })
          .on('end', () => {
            this.logger.debug('Video frame extracted', { filePath, timestampSeconds, thumbnailPath });
            resolve(thumbnailPath);
          })
          .on('error', (err: Error) => {
            this.logger.error('Video frame extraction failed', err, { filePath, timestampSeconds });
            reject(this.errorHandler.createThumbnailError('Failed to extract video frame', filePath));
          });
      });
    } catch (error) {
      this.logger.error('Video frame extraction failed', error as Error, { filePath, timestampSeconds });
      throw error;
    }
  }

  async extractYouTubeFrame(youtubeUrl: string, timestampSeconds: number = 1): Promise<string> {
    try {
      // Extract video ID from URL
      const videoId = this.extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        throw this.errorHandler.createValidationError('Invalid YouTube URL');
      }

      // Ensure thumbnail directory exists
      await this.ensureDirectories();

      const thumbnailFilename = `youtube_${videoId}_${timestampSeconds}.jpg`;
      const thumbnailPath = path.join(this.thumbnailPath, thumbnailFilename);

      // Check if thumbnail already exists
      if (await this.fileExists(thumbnailPath)) {
        this.logger.debug('YouTube thumbnail already exists', { thumbnailPath });
        return thumbnailPath;
      }

      // Try using yt-dlp to download a short segment and extract frame
      // This is more reliable than using ffmpeg directly with YouTube URLs
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Create a temporary video file path
      const tempVideoFilename = `youtube_${videoId}_temp_${Date.now()}.mp4`;
      const tempVideoPath = path.join(this.thumbnailPath, tempVideoFilename);

      try {
        // Calculate start time (subtract a small buffer to ensure we have data)
        const startTime = Math.max(0, timestampSeconds - 5);
        const duration = 10; // Download 10 seconds around the timestamp

        // Use yt-dlp to download a short segment
        // yt-dlp -f "best[height<=720]" -ss START -t DURATION URL -o OUTPUT
        const ytdlpCommand = `yt-dlp -f "best[height<=720]/best" --no-playlist --no-warnings --quiet -ss ${startTime} -t ${duration} "${youtubeUrl}" -o "${tempVideoPath}"`;
        
        this.logger.debug('Attempting to download YouTube segment with yt-dlp', { 
          youtubeUrl, 
          startTime, 
          duration,
          tempVideoPath 
        });

        await execAsync(ytdlpCommand, { timeout: 60000 }); // 60 second timeout

        // Check if video file was created
        if (!(await this.fileExists(tempVideoPath))) {
          throw new Error('Failed to download YouTube video segment');
        }

        // Now extract frame at the relative timestamp within the segment
        const relativeTimestamp = timestampSeconds - startTime;

        return new Promise((resolve, reject) => {
          ffmpeg(tempVideoPath)
            .screenshots({
              timestamps: [relativeTimestamp],
              filename: thumbnailFilename,
              folder: this.thumbnailPath,
              size: '1920x1080'
            })
            .on('end', async () => {
              // Clean up temporary video file
              try {
                await fs.unlink(tempVideoPath);
                this.logger.debug('Temporary video file deleted', { tempVideoPath });
              } catch (cleanupError) {
                this.logger.warn('Failed to delete temporary video file', { 
                  error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
                  tempVideoPath 
                });
              }

              this.logger.debug('YouTube frame extracted', { youtubeUrl, timestampSeconds, thumbnailPath });
              resolve(thumbnailPath);
            })
            .on('error', async (err: Error) => {
              // Clean up temporary video file on error
              try {
                await fs.unlink(tempVideoPath);
              } catch (cleanupError) {
                // Ignore cleanup errors
              }

              this.logger.warn('Frame extraction from downloaded segment failed, using thumbnail API fallback', { 
                youtubeUrl, 
                error: err.message 
              });

              // Fallback to YouTube's thumbnail API (doesn't support custom timestamps)
              const fallbackUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
              this.downloadYouTubeThumbnail(fallbackUrl, thumbnailPath)
                .then(() => resolve(thumbnailPath))
                .catch((downloadError) => {
                  this.logger.error('YouTube thumbnail download failed', downloadError as Error, { youtubeUrl });
                  reject(this.errorHandler.createThumbnailError('Failed to extract YouTube frame', youtubeUrl));
                });
            });
        });
      } catch (error) {
        // Clean up temporary file if it exists
        try {
          if (await this.fileExists(tempVideoPath)) {
            await fs.unlink(tempVideoPath);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }

        // If yt-dlp fails, fallback to YouTube thumbnail API
        this.logger.warn('yt-dlp download failed, using thumbnail API fallback', { 
          youtubeUrl, 
          videoId,
          timestampSeconds,
          thumbnailPath,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        });

        try {
          const fallbackUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          await this.downloadYouTubeThumbnail(fallbackUrl, thumbnailPath);
          
          // Verify the fallback thumbnail was saved
          if (!(await this.fileExists(thumbnailPath))) {
            throw new Error('Fallback thumbnail was not saved successfully');
          }
          
          this.logger.debug('YouTube thumbnail saved via fallback API', { thumbnailPath });
          return thumbnailPath;
        } catch (fallbackError) {
          this.logger.error('Fallback thumbnail download also failed', fallbackError as Error, {
            youtubeUrl,
            videoId,
            thumbnailPath
          });
          throw this.errorHandler.createThumbnailError(
            `Failed to extract YouTube frame: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
            youtubeUrl
          );
        }
      }
    } catch (error) {
      this.logger.error('YouTube frame extraction failed', error as Error, { youtubeUrl, timestampSeconds });
      throw error;
    }
  }

  private async downloadYouTubeThumbnail(url: string, outputPath: string): Promise<void> {
    try {
      // Ensure directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download thumbnail: ${response.statusText} (${response.status})`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      
      // Verify file was written
      if (!(await this.fileExists(outputPath))) {
        throw new Error('Thumbnail file was not created after write');
      }
      
      this.logger.debug('YouTube thumbnail downloaded and saved', { url, outputPath, size: buffer.length });
    } catch (error) {
      this.logger.error('Failed to download YouTube thumbnail', error as Error, { url, outputPath });
      throw error;
    }
  }

  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/.*[?&]v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(id: string, userId?: string): Promise<boolean> {
    try {
      const file = await this.findFileById(id);
      if (!file) {
        throw this.errorHandler.createFileNotFoundError(id);
      }

      // Check ownership - only owner can delete
      if (userId && file.userId !== userId) {
        throw this.errorHandler.createValidationError('You do not have permission to delete this file');
      }

      // Delete physical files
      await this.deletePhysicalFile(file.filePath);
      if (file.thumbnailPath) {
        await this.deletePhysicalFile(file.thumbnailPath);
      }

      // Clean up related references before DB delete (defensive in case FK PRAGMA is off)
      try {
        if (this.fileShareRepository) {
          await this.fileShareRepository.deleteByFile(id);
        }
        // Remove post attachments referencing this file
        await DatabaseUtils.executeQuery('DELETE FROM post_attachments WHERE file_id = ?', [id]);
      } catch {}

      // Delete from database
      const deleted = await this.deleteFileFromDatabase(id);

      this.logger.info('File deleted successfully', { fileId: id, userId });
      return deleted;
    } catch (error) {
      this.logger.error('File deletion failed', error as Error, { fileId: id });
      throw error;
    }
  }

  async renameFile(id: string, newName: string, userId?: string): Promise<FileEntity> {
    try {
      const file = await this.findFileById(id);
      if (!file) {
        throw this.errorHandler.createFileNotFoundError(id);
      }

      if (userId && file.userId && file.userId !== userId) {
        throw this.errorHandler.createValidationError('You do not have permission to rename this file');
      }

      const trimmedName = newName?.trim();
      if (!trimmedName) {
        throw this.errorHandler.createValidationError('File name is required', 'originalName');
      }

      if (trimmedName.length > 255) {
        throw this.errorHandler.createValidationError('File name is too long', 'originalName');
      }

      const originalExt = path.extname(file.originalName || file.filename || '');
      const providedExt = path.extname(trimmedName);

      let finalName = trimmedName;
      if (!providedExt && originalExt) {
        finalName = `${trimmedName}${originalExt}`;
      }

      const sanitizedName = finalName.replace(/[\r\n]+/g, '').trim();
      if (!sanitizedName) {
        throw this.errorHandler.createValidationError('File name is invalid', 'originalName');
      }

      const updatedFile = await this.updateFileInDatabase(id, {
        originalName: sanitizedName
      } as Partial<FileEntity>);

      this.logger.info('File renamed successfully', { fileId: id, userId, newName: sanitizedName });
      return updatedFile;
    } catch (error) {
      this.logger.error('File rename failed', error as Error, { fileId: id });
      throw error;
    }
  }

  async getFiles(folderId: string | null, userId?: string): Promise<FileEntity[]> {
    try {
      const files = await this.findFilesByFolder(folderId);
      
      // Filter files based on access
      const accessibleFiles = await Promise.all(
        files.map(async (file) => {
          const hasAccess = await this.checkFileAccess(file.id, userId, file);
          return hasAccess ? file : null;
        })
      );

      const filteredFiles = accessibleFiles.filter((f): f is FileEntity => f !== null);
      
      this.logger.debug('Files retrieved', { folderId, count: filteredFiles.length, userId });
      return filteredFiles;
    } catch (error) {
      this.logger.error('Failed to get files', error as Error, { folderId });
      throw error;
    }
  }

  async searchFiles(query: string, userId?: string): Promise<FileEntity[]> {
    try {
      const files = await this.searchFilesInDatabase(query);
      
      // Filter files based on access
      const accessibleFiles = await Promise.all(
        files.map(async (file) => {
          const hasAccess = await this.checkFileAccess(file.id, userId, file);
          return hasAccess ? file : null;
        })
      );

      const filteredFiles = accessibleFiles.filter((f): f is FileEntity => f !== null);
      
      this.logger.debug('Files searched', { query, count: filteredFiles.length, userId });
      return filteredFiles;
    } catch (error) {
      this.logger.error('File search failed', error as Error, { query });
      throw error;
    }
  }

  // Get files shared with a specific user
  async getFilesSharedWithUser(userId: string): Promise<FileEntity[]> {
    try {
      if (!this.fileShareRepository) {
        throw this.errorHandler.createConfigurationError('File share repository not configured');
      }

      const shares = await this.fileShareRepository.findByUser(userId);
      const files: FileEntity[] = [];

      for (const share of shares) {
        const file = await this.findFileById(share.fileId);
        if (file) {
          files.push(file);
        }
      }

      this.logger.debug('Files shared with user retrieved', { userId, count: files.length });
      return files;
    } catch (error) {
      this.logger.error('Failed to get files shared with user', error as Error, { userId });
      throw error;
    }
  }

  async shareFile(fileId: string, userId: string, shareData: ShareFileData): Promise<FileShareEntity> {
    try {
      // Verify file ownership
      const file = await this.findFileById(fileId);
      if (!file) {
        throw this.errorHandler.createFileNotFoundError(fileId);
      }

      if (file.userId !== userId) {
        throw this.errorHandler.createValidationError('You do not have permission to share this file');
      }

      if (!this.fileShareRepository) {
        throw this.errorHandler.createConfigurationError('File share repository not configured');
      }

      const share = await this.fileShareRepository.create(shareData);
      this.logger.info('File shared successfully', { fileId, userId, shareId: share.id });
      return share;
    } catch (error) {
      this.logger.error('File sharing failed', error as Error, { fileId, userId });
      throw error;
    }
  }

  // Share file with multiple users
  async shareFileWithUsers(fileId: string, userId: string, sharedWithUserIds: string[], accessLevel: AccessLevel = 'read'): Promise<FileShareEntity[]> {
    try {
      // Verify file ownership
      const file = await this.findFileById(fileId);
      if (!file) {
        throw this.errorHandler.createFileNotFoundError(fileId);
      }

      if (file.userId !== userId) {
        throw this.errorHandler.createValidationError('You do not have permission to share this file');
      }

      if (!this.fileShareRepository) {
        throw this.errorHandler.createConfigurationError('File share repository not configured');
      }

      if (sharedWithUserIds.length === 0) {
        throw this.errorHandler.createValidationError('At least one user must be selected');
      }

      // Create share data for each user
      const shareDataList = sharedWithUserIds.map(sharedUserId => ({
        fileId,
        sharedWithUserId: sharedUserId,
        accessLevel
      }));

      const shares = await this.fileShareRepository.createMany(shareDataList);
      this.logger.info('File shared with multiple users', { fileId, userId, count: shares.length });
      return shares;
    } catch (error) {
      this.logger.error('Multi-user file sharing failed', error as Error, { fileId, userId });
      throw error;
    }
  }

  private async checkFileAccess(fileId: string, userId: string | undefined, file: FileEntity): Promise<boolean> {
    if (!userId) {
      this.logger.debug('File access granted: public download', { fileId });
      return true;
    }

    // Owner always has access
    if (userId && file.userId && file.userId === userId) {
      this.logger.debug('File access granted: owner', { fileId, userId, fileUserId: file.userId });
      return true;
    }

    // Allow access if the file is under a public folder
    try {
      if ((file as any).folderId) {
        const folder = await DatabaseUtils.findOne<any>('SELECT is_public FROM folders WHERE id = ?', [(file as any).folderId]);
        if (folder && (folder.is_public === 1 || folder.is_public === true)) {
          this.logger.debug('File access granted: public folder', { fileId, folderId: (file as any).folderId });
          return true;
        }
      }
    } catch {}

    // Check sharing if repository is available
    if (this.fileShareRepository) {
      const hasAccess = await this.fileShareRepository.checkAccess(fileId, userId);
      this.logger.debug('File access check via share repository', { fileId, userId, hasAccess });
      return hasAccess;
    }

    // If no share repository and file is not public, deny access
    this.logger.debug('File access denied: no share repository', { fileId, userId, fileUserId: file.userId });
    return false;
  }

  // Small, reusable utility functions
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw this.errorHandler.createValidationError('No file provided');
    }

    if (file.size > this.maxFileSize) {
      const maxMb = Math.round(this.maxFileSize / (1024 * 1024));
      throw this.errorHandler.createValidationError(
        `File size exceeds maximum allowed size of ${maxMb} MB`,
        'fileSize',
        file.size
      );
    }

    if (!this.isMimeAllowed(file.mimetype)) {
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
  private async saveFileToDatabase(fileData: CreateFileData, userId?: string): Promise<FileEntity> {
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

  private async updateFileInDatabase(id: string, data: Partial<FileEntity>): Promise<FileEntity> {
    throw new Error('FileRepository not injected');
  }
}