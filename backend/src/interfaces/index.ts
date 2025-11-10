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
  create(fileData: CreateFileData, userId?: string, accessType?: string): Promise<FileEntity>;
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
  upload(file: Express.Multer.File, userId: string, folderId?: string): Promise<FileEntity>;
  download(id: string, userId?: string): Promise<{ filePath: string; fileName: string; mimeType: string }>;
  generateThumbnail(filePath: string, mimeType: string): Promise<string>;
  deleteFile(id: string, userId?: string): Promise<boolean>;
  renameFile(id: string, newName: string, userId?: string): Promise<FileEntity>;
  getFiles(folderId: string | null, userId?: string): Promise<FileEntity[]>;
  searchFiles(query: string, userId?: string): Promise<FileEntity[]>;
  shareFile(fileId: string, userId: string, shareData: ShareFileData): Promise<FileShareEntity>;
  shareFileWithUsers(fileId: string, userId: string, sharedWithUserIds: string[], accessLevel?: AccessLevel): Promise<FileShareEntity[]>;
  getFilesSharedWithUser(userId: string): Promise<FileEntity[]>;
}

export interface IFolderService {
  createFolder(name: string, parentId?: string, userId?: string): Promise<FolderEntity>;
  getFolders(parentId?: string): Promise<FolderEntity[]>;
  getFoldersWithFiles(parentId?: string, userId?: string): Promise<FolderWithFiles[]>;
  updateFolder(id: string, data: Partial<FolderEntity>, userId?: string): Promise<FolderEntity>;
  deleteFolder(id: string, userId?: string): Promise<boolean>;
  shareFolderWithUsers(folderId: string, userId: string, sharedWithUserIds: string[], accessLevel?: AccessLevel): Promise<any[]>;
  getFoldersSharedWithUser(userId: string): Promise<FolderEntity[]>;
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
  userId?: string;
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
  isPublic?: boolean;
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

// ========================================
// Media Hub - Extended Interfaces
// ========================================

// User and Role Entities
export type LanguageCode = 'ar' | 'en' | 'fr' | 'pt' | 'es' | 'sw';

export interface UserEntity {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  phone?: string;
  jobTitle?: string;
  organization?: string;
  bio?: string;
  isActive: boolean;
  emailVerified?: boolean;
  language: LanguageCode;
  lastLogin?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Category and Subcategory Entities
export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  showOnMenu?: boolean;
  menuOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubcategoryEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Navigation Link Entities
export interface NavLinkEntity {
  id: string;
  label: string;
  url?: string;
  route?: string;
  external: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Publication Entities
export type PublicationStatus = 'pending' | 'rejected' | 'approved' | 'draft';

export interface PublicationEntity {
  id: string;
  title: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  coverImage?: string;
  categoryId: string;
  creatorId: string;
  approvedBy?: string;
  status: PublicationStatus;
  publicationDate?: Date;
  hasComments: boolean;
  views: number;
  uniqueHits: number;
  isFeatured: boolean;
  isLeaderboard: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicationWithRelations extends PublicationEntity {
  category?: CategoryEntity;
  creator?: UserEntity;
  approver?: UserEntity;
  subcategories?: SubcategoryEntity[];
  attachments?: FileEntity[];
  authors?: UserEntity[];
  tags?: TagEntity[];
  isLiked?: boolean;
}

export interface TagEntity {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagWithUsage extends TagEntity {
  usageCount: number;
}

// File Sharing
export type AccessType = 'private' | 'public' | 'shared';
export type AccessLevel = 'read' | 'write';

export interface FileShareEntity {
  id: string;
  fileId: string;
  sharedWithUserId?: string;
  accessLevel: AccessLevel;
  createdAt: Date;
}

// Update existing entities
export interface FileEntity {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  folderId?: string;
  userId?: string;
  accessType?: AccessType;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderEntity {
  id: string;
  name: string;
  parentId?: string;
  userId?: string;
  accessType?: AccessType;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  organization?: string;
  bio?: string;
  language?: LanguageCode;
  isActive?: boolean;
  emailVerified?: boolean;
  roleIds?: string[];
}

export interface CreateRoleData {
  name: string;
  slug: string;
  description?: string;
}

export interface CreatePermissionData {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  showOnMenu?: boolean;
  menuOrder?: number;
}

export interface CreateSubcategoryData {
  name: string;
  slug: string;
  description?: string;
}

export interface CreateNavLinkData {
  label: string;
  url?: string;
  route?: string;
  external?: boolean;
  order?: number;
  isActive?: boolean;
}

export interface UpdateNavLinkData {
  label?: string;
  url?: string;
  route?: string;
  external?: boolean;
  order?: number;
  isActive?: boolean;
}

export interface CreatePublicationData {
  title: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  coverImage?: string;
  categoryId: string;
  creatorId: string;
  subcategoryIds?: string[];
  attachmentFileIds?: string[];
  authorIds?: string[];
  status?: PublicationStatus;
  publicationDate?: Date;
  hasComments?: boolean;
  isFeatured?: boolean;
  isLeaderboard?: boolean;
  tags?: string[];
}

export interface UpdatePublicationData {
  title?: string;
  slug?: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  coverImage?: string;
  categoryId?: string;
  subcategoryIds?: string[];
  attachmentFileIds?: string[];
  authorIds?: string[];
  status?: PublicationStatus;
  publicationDate?: Date;
  hasComments?: boolean;
  isFeatured?: boolean;
  isLeaderboard?: boolean;
  approvedBy?: string;
  tags?: string[];
}

export interface ShareFileData {
  fileId: string;
  sharedWithUserId?: string; // null means public
  accessLevel?: AccessLevel;
}

// Repository Interfaces
export interface IUserRepository {
  create(userData: CreateUserData): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findAll(includeInactive?: boolean): Promise<UserEntity[]>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: string): Promise<boolean>;
}

export interface IRoleRepository {
  create(roleData: CreateRoleData): Promise<RoleEntity>;
  findById(id: string): Promise<RoleEntity | null>;
  findBySlug(slug: string): Promise<RoleEntity | null>;
  findAll(): Promise<RoleEntity[]>;
  update(id: string, data: Partial<RoleEntity>): Promise<RoleEntity>;
  delete(id: string): Promise<boolean>;
  assignToUser(userId: string, roleId: string): Promise<boolean>;
  removeFromUser(userId: string, roleId: string): Promise<boolean>;
  getUserRoles(userId: string): Promise<RoleEntity[]>;
}

export interface IPermissionRepository {
  create(permissionData: CreatePermissionData): Promise<PermissionEntity>;
  findById(id: string): Promise<PermissionEntity | null>;
  findBySlug(slug: string): Promise<PermissionEntity | null>;
  findAll(): Promise<PermissionEntity[]>;
  update(id: string, data: Partial<PermissionEntity>): Promise<PermissionEntity>;
  delete(id: string): Promise<boolean>;
  assignToRole(roleId: string, permissionId: string): Promise<boolean>;
  removeFromRole(roleId: string, permissionId: string): Promise<boolean>;
  getRolePermissions(roleId: string): Promise<PermissionEntity[]>;
  getUserPermissions(userId: string): Promise<PermissionEntity[]>;
}

export interface ICategoryRepository {
  create(categoryData: CreateCategoryData): Promise<CategoryEntity>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  findAll(): Promise<CategoryEntity[]>;
  update(id: string, data: Partial<CategoryEntity>): Promise<CategoryEntity>;
  delete(id: string): Promise<boolean>;
  addSubcategory(categoryId: string, subcategoryId: string): Promise<boolean>;
  removeSubcategory(categoryId: string, subcategoryId: string): Promise<boolean>;
  getSubcategories(categoryId: string): Promise<SubcategoryEntity[]>;
}

export interface ISubcategoryRepository {
  create(subcategoryData: CreateSubcategoryData): Promise<SubcategoryEntity>;
  findById(id: string): Promise<SubcategoryEntity | null>;
  findBySlug(slug: string): Promise<SubcategoryEntity | null>;
  findAll(): Promise<SubcategoryEntity[]>;
  update(id: string, data: Partial<SubcategoryEntity>): Promise<SubcategoryEntity>;
  delete(id: string): Promise<boolean>;
}

export interface INavLinkRepository {
  create(navLinkData: CreateNavLinkData): Promise<NavLinkEntity>;
  findById(id: string): Promise<NavLinkEntity | null>;
  findAll(): Promise<NavLinkEntity[]>;
  findActive(): Promise<NavLinkEntity[]>;
  update(id: string, data: UpdateNavLinkData): Promise<NavLinkEntity>;
  delete(id: string): Promise<boolean>;
}

export interface PublicationFilters {
  status?: PublicationStatus;
  categoryId?: string;
  subcategoryId?: string;
  creatorId?: string;
  authorId?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  search?: string; // Search in title, description, meta fields
  tags?: string[];
}

export interface ITagRepository {
  findAll(): Promise<TagEntity[]>;
  findAllWithUsage(): Promise<TagWithUsage[]>;
  findByNames(names: string[]): Promise<TagEntity[]>;
  findByPost(postId: string): Promise<TagEntity[]>;
  findOrCreate(names: string[]): Promise<TagEntity[]>;
  assignTagsToPost(postId: string, tagIds: string[]): Promise<void>;
}

export interface IPublicationRepository {
  create(publicationData: CreatePublicationData): Promise<PublicationEntity>;
  findById(id: string): Promise<PublicationEntity | null>;
  findBySlug(slug: string): Promise<PublicationEntity | null>;
  findByCategory(categoryId: string, limit?: number, offset?: number): Promise<PublicationEntity[]>;
  findByStatus(status: PublicationStatus, limit?: number, offset?: number): Promise<PublicationEntity[]>;
  findByCreator(creatorId: string, limit?: number, offset?: number): Promise<PublicationEntity[]>;
  findAll(filters?: PublicationFilters, limit?: number, offset?: number): Promise<PublicationEntity[]>;
  countAll(filters?: PublicationFilters): Promise<number>;
  findFeatured(limit?: number): Promise<PublicationEntity[]>;
  findLeaderboard(limit?: number): Promise<PublicationEntity[]>;
  findPublished(categoryId?: string, subcategoryId?: string, limit?: number, offset?: number, tags?: string[], search?: string): Promise<PublicationEntity[]>;
  countPublished(categoryId?: string, subcategoryId?: string, tags?: string[], search?: string): Promise<number>;
  search(query: string, limit?: number, offset?: number): Promise<PublicationEntity[]>;
  update(id: string, data: UpdatePublicationData): Promise<PublicationEntity>;
  delete(id: string): Promise<boolean>;
  incrementViews(id: string): Promise<void>;
  recordView(publicationId: string, userId?: string, viewerToken?: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
  addSubcategory(publicationId: string, subcategoryId: string): Promise<boolean>;
  removeSubcategory(publicationId: string, subcategoryId: string): Promise<boolean>;
  addAttachment(publicationId: string, fileId: string, displayOrder?: number): Promise<boolean>;
  removeAttachment(publicationId: string, fileId: string): Promise<boolean>;
  addAuthor(publicationId: string, authorId: string): Promise<boolean>;
  removeAuthor(publicationId: string, authorId: string): Promise<boolean>;
  getWithRelations(id: string): Promise<PublicationWithRelations | null>;
  updateCounts(id: string, counts: { likesCount?: number; commentsCount?: number }): Promise<void>;
}

export interface IFileShareRepository {
  create(shareData: ShareFileData): Promise<FileShareEntity>;
  createMany(shareDataList: ShareFileData[]): Promise<FileShareEntity[]>;
  findByFile(fileId: string): Promise<FileShareEntity[]>;
  findByUser(userId: string): Promise<FileShareEntity[]>;
  findPublicFiles(): Promise<string[]>; // Returns file IDs
  delete(id: string): Promise<boolean>;
  deleteByFile(fileId: string): Promise<boolean>;
  deleteByFileAndUser(fileId: string, userId: string): Promise<boolean>;
  checkAccess(fileId: string, userId?: string): Promise<boolean>;
}

export interface PostLikeEntity {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface PostCommentAuthor {
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

export interface PostCommentEntity {
  id: string;
  postId: string;
  userId?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  content: string;
  createdAt: Date;
  author?: PostCommentAuthor;
}

export interface CreatePostCommentData {
  postId: string;
  userId?: string;
  authorName?: string;
  authorEmail?: string;
  content: string;
}

// Service Interfaces
export interface IPublicationService {
  createPublication(publicationData: CreatePublicationData): Promise<PublicationEntity>;
  getPublication(id: string, userId?: string): Promise<PublicationWithRelations | null>;
  getPublicationBySlug(slug: string, userId?: string): Promise<PublicationWithRelations | null>;
  getFeaturedPublications(limit?: number): Promise<PublicationWithRelations[]>;
  getLeaderboardPublications(limit?: number): Promise<PublicationWithRelations[]>;
  getPublishedPublications(categoryId?: string, subcategoryId?: string, limit?: number, offset?: number, tags?: string[], search?: string): Promise<{ publications: PublicationWithRelations[]; total: number; page: number; limit: number; totalPages: number }>;
  getPublications(filters?: PublicationFilters, userId?: string, limit?: number, offset?: number): Promise<{ publications: PublicationWithRelations[]; total: number; page: number; limit: number; totalPages: number }>;
  updatePublication(
    id: string,
    data: UpdatePublicationData,
    userContext?: {
      userId?: string;
      roles?: string[];
      permissions?: string[];
    }
  ): Promise<PublicationEntity>;
  deletePublication(id: string, userId?: string): Promise<boolean>;
  approvePublication(id: string, approverId: string): Promise<PublicationEntity>;
  rejectPublication(id: string, approverId: string): Promise<PublicationEntity>;
  trackView(id: string, userId?: string, viewerToken?: string, ipAddress?: string, userAgent?: string): Promise<void>;
  searchPublications(query: string, limit?: number, offset?: number): Promise<PublicationWithRelations[]>;
  likePublication(id: string, userId: string): Promise<{ liked: boolean; likes: number }>;
  unlikePublication(id: string, userId: string): Promise<{ liked: boolean; likes: number }>;
  getComments(id: string, options?: { limit?: number; offset?: number }): Promise<{ comments: PostCommentEntity[]; total: number; limit: number; offset: number; page: number; totalPages: number }>;
  addComment(id: string, data: CreatePostCommentData): Promise<{ comment: PostCommentEntity; commentsCount: number }>;
  deleteComment(commentId: string, expectedPostId?: string): Promise<{ deleted: boolean; postId: string; commentsCount: number }>;
}

export interface ICategoryService {
  createCategory(categoryData: CreateCategoryData): Promise<CategoryEntity>;
  getCategory(id: string): Promise<CategoryEntity | null>;
  getAllCategories(): Promise<CategoryEntity[]>;
  updateCategory(id: string, data: Partial<CategoryEntity>): Promise<CategoryEntity>;
  deleteCategory(id: string): Promise<boolean>;
  addSubcategoryToCategory(categoryId: string, subcategoryId: string): Promise<boolean>;
  updateCategorySubcategories(categoryId: string, subcategoryIds: string[]): Promise<void>;
  getCategorySubcategories(categoryId: string): Promise<SubcategoryEntity[]>;
}

export interface ISubcategoryService {
  createSubcategory(subcategoryData: CreateSubcategoryData): Promise<SubcategoryEntity>;
  getSubcategory(id: string): Promise<SubcategoryEntity | null>;
  getAllSubcategories(): Promise<SubcategoryEntity[]>;
  updateSubcategory(id: string, data: Partial<SubcategoryEntity>): Promise<SubcategoryEntity>;
  deleteSubcategory(id: string): Promise<boolean>;
}

export interface INavLinkService {
  createNavLink(navLinkData: CreateNavLinkData): Promise<NavLinkEntity>;
  getNavLink(id: string): Promise<NavLinkEntity | null>;
  getAllNavLinks(): Promise<NavLinkEntity[]>;
  getActiveNavLinks(): Promise<NavLinkEntity[]>;
  updateNavLink(id: string, data: UpdateNavLinkData): Promise<NavLinkEntity>;
  deleteNavLink(id: string): Promise<boolean>;
}

// Settings Entities
export interface SettingsEntity {
  id: string;
  key: string;
  value: string; // JSON string
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettingsRepository {
  findByKey(key: string): Promise<SettingsEntity | null>;
  findAll(): Promise<SettingsEntity[]>;
  create(key: string, value: string, description?: string): Promise<SettingsEntity>;
  update(key: string, value: string, description?: string): Promise<SettingsEntity>;
  upsert(key: string, value: string, description?: string): Promise<SettingsEntity>;
  delete(key: string): Promise<boolean>;
}

export interface ISettingsService {
  getSettings(): Promise<Record<string, any>>;
  getSetting(key: string): Promise<any>;
  updateSettings(settings: Record<string, any>): Promise<void>;
  updateSetting(key: string, value: any, description?: string): Promise<void>;
}

export interface IPostLikeRepository {
  addLike(postId: string, userId: string): Promise<void>;
  removeLike(postId: string, userId: string): Promise<void>;
  hasUserLiked(postId: string, userId: string): Promise<boolean>;
  countByPost(postId: string): Promise<number>;
}

export interface IPostCommentRepository {
  create(commentData: CreatePostCommentData): Promise<PostCommentEntity>;
  findByPost(postId: string, limit: number, offset: number): Promise<PostCommentEntity[]>;
  countByPost(postId: string): Promise<number>;
  findById(id: string): Promise<PostCommentEntity | null>;
  delete(id: string): Promise<boolean>;
}