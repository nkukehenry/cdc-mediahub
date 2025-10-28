// Core interfaces for the file manager module
export * from './Cache';

export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
}

export interface IErrorHandler {
  handle(error: Error, context?: any): void;
  createError(type: ErrorType, message: string, context?: any): FileManagerError;
}

export interface IFileRepository {
  create(fileData: CreateFileData): Promise<FileEntity>;
  findById(id: string): Promise<FileEntity | null>;
  findByFolder(folderId: string | null): Promise<FileEntity[]>;
  update(id: string, data: Partial<FileEntity>): Promise<FileEntity>;
  delete(id: string): Promise<boolean>;
  search(query: string): Promise<FileEntity[]>;
}

export interface IFolderRepository {
  create(folderData: CreateFolderData): Promise<FolderEntity>;
  findById(id: string): Promise<FolderEntity | null>;
  findByParent(parentId: string | null): Promise<FolderEntity[]>;
  update(id: string, data: Partial<FolderEntity>): Promise<FolderEntity>;
  delete(id: string): Promise<boolean>;
}

export interface IFileService {
  upload(file: Express.Multer.File, folderId?: string): Promise<FileEntity>;
  download(id: string): Promise<{ filePath: string; fileName: string; mimeType: string }>;
  generateThumbnail(filePath: string, mimeType: string): Promise<string>;
  deleteFile(id: string): Promise<boolean>;
  getFiles(folderId: string | null): Promise<FileEntity[]>;
  searchFiles(query: string): Promise<FileEntity[]>;
}

export interface IFolderService {
  createFolder(name: string, parentId?: string): Promise<FolderEntity>;
  getFolders(parentId?: string): Promise<FolderEntity[]>;
  updateFolder(id: string, data: Partial<FolderEntity>): Promise<FolderEntity>;
  deleteFolder(id: string): Promise<boolean>;
}

export interface IFileManagerConfig {
  uploadPath: string;
  thumbnailPath: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  enableThumbnails: boolean;
  logLevel: LogLevel;
}

export interface IPlugin {
  name: string;
  version: string;
  initialize(config: IFileManagerConfig): Promise<void>;
  destroy(): Promise<void>;
}

export interface IFileManager {
  initialize(config: IFileManagerConfig): Promise<void>;
  getFileService(): IFileService;
  getFolderService(): IFolderService;
  registerPlugin(plugin: IPlugin): Promise<void>;
  getLogger(): ILogger;
  getErrorHandler(): IErrorHandler;
}

// Data Transfer Objects
export interface CreateFileData {
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  folderId?: string;
}

export interface CreateFolderData {
  name: string;
  parentId?: string;
}

// Entities
export interface FileEntity {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderEntity {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderWithFiles extends FolderEntity {
  files: FileEntity[];
  subfolders: FolderWithFiles[];
}

// Enums
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FOLDER_NOT_FOUND = 'FOLDER_NOT_FOUND',
  UPLOAD_ERROR = 'UPLOAD_ERROR',
  THUMBNAIL_ERROR = 'THUMBNAIL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Custom Error Classes
export class FileManagerError extends Error {
  public readonly type: ErrorType;
  public readonly context?: any;
  public readonly timestamp: Date;

  constructor(type: ErrorType, message: string, context?: any) {
    super(message);
    this.name = 'FileManagerError';
    this.type = type;
    this.context = context;
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileManagerError);
    }
  }
}

export class ValidationError extends FileManagerError {
  constructor(message: string, context?: any) {
    super(ErrorType.VALIDATION_ERROR, message, context);
    this.name = 'ValidationError';
  }
}

export class FileNotFoundError extends FileManagerError {
  constructor(fileId: string, context?: any) {
    super(ErrorType.FILE_NOT_FOUND, `File with ID ${fileId} not found`, context);
    this.name = 'FileNotFoundError';
  }
}

export class FolderNotFoundError extends FileManagerError {
  constructor(folderId: string, context?: any) {
    super(ErrorType.FOLDER_NOT_FOUND, `Folder with ID ${folderId} not found`, context);
    this.name = 'FolderNotFoundError';
  }
}

export class UploadError extends FileManagerError {
  constructor(message: string, context?: any) {
    super(ErrorType.UPLOAD_ERROR, message, context);
    this.name = 'UploadError';
  }
}

export class ThumbnailError extends FileManagerError {
  constructor(message: string, context?: any) {
    super(ErrorType.THUMBNAIL_ERROR, message, context);
    this.name = 'ThumbnailError';
  }
}

export class DatabaseError extends FileManagerError {
  constructor(message: string, context?: any) {
    super(ErrorType.DATABASE_ERROR, message, context);
    this.name = 'DatabaseError';
  }
}

export class ConfigurationError extends FileManagerError {
  constructor(message: string, context?: any) {
    super(ErrorType.CONFIGURATION_ERROR, message, context);
    this.name = 'ConfigurationError';
  }
}