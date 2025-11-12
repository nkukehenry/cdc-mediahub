import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { 
  IFileRepository, 
  IFolderRepository,
  FileEntity, 
  FolderEntity,
  CreateFileData,
  CreateFolderData
} from '../interfaces';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { DatabaseError } from '../interfaces';
import { DatabaseUtils } from '../utils/DatabaseUtils';

export class DatabaseConnection {
  private pool: mysql.Pool;
  private logger = getLogger('DatabaseConnection');
  private errorHandler = getErrorHandler();

  constructor(config: {
    connectionString?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }) {
    // Create MySQL connection pool
    if (config.connectionString) {
      // Parse connection string (mysql://user:password@host:port/database)
      try {
        const url = new URL(config.connectionString);
        this.pool = mysql.createPool({
          host: url.hostname,
          port: parseInt(url.port) || 3306,
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1), // Remove leading '/'
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 0
        });
      } catch (error) {
        this.logger.error('Failed to parse connection string', error as Error);
        throw new Error('Invalid database connection string format. Expected: mysql://user:password@host:port/database');
      }
    } else {
      this.pool = mysql.createPool({
        host: config.host || 'localhost',
        port: config.port || 3306,
        user: config.user || 'root',
        password: config.password || '',
        database: config.database || 'filemanager',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });
    }
    // Don't call initializeTables here - it will be called after DatabaseUtils.initialize()
  }

  async initialize(): Promise<void> {
    // Initialize DatabaseUtils first
    DatabaseUtils.initialize(this.pool);
    // Then initialize tables
    await this.initializeTables();
  }

  /**
   * Check if a column exists in a table
   */
  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const [rows]: any = await this.pool.execute(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = ?`,
        [tableName, columnName]
      );
      return rows && rows.length > 0;
    } catch (error) {
      this.logger.warn(`Error checking column ${columnName} in ${tableName}`, error as Error);
      return false;
    }
  }

  /**
   * Migrate existing tables to add new columns
   */
  private async migrateTables(): Promise<void> {
    try {
      // Migrate folders table
      const foldersHasUserId = await this.columnExists('folders', 'user_id');
      const foldersHasAccessType = await this.columnExists('folders', 'access_type');
      const foldersHasIsPublic = await this.columnExists('folders', 'is_public');
      
      if (!foldersHasUserId) {
        await DatabaseUtils.executeQuery(`ALTER TABLE folders ADD COLUMN user_id VARCHAR(36)`);
        this.logger.info('Added user_id column to folders table');
      }
      
      if (!foldersHasAccessType) {
        await DatabaseUtils.executeQuery(`ALTER TABLE folders ADD COLUMN access_type VARCHAR(20) DEFAULT 'private'`);
        this.logger.info('Added access_type column to folders table');
      }
      if (!foldersHasIsPublic) {
        await DatabaseUtils.executeQuery(`ALTER TABLE folders ADD COLUMN is_public TINYINT(1) DEFAULT 0`);
        this.logger.info('Added is_public column to folders table');
      }

      // Migrate files table
      const filesHasUserId = await this.columnExists('files', 'user_id');
      const filesHasAccessType = await this.columnExists('files', 'access_type');
      
      if (!filesHasUserId) {
        await DatabaseUtils.executeQuery(`ALTER TABLE files ADD COLUMN user_id VARCHAR(36)`);
        this.logger.info('Added user_id column to files table');
      }
      
      if (!filesHasAccessType) {
        await DatabaseUtils.executeQuery(`ALTER TABLE files ADD COLUMN access_type VARCHAR(20) DEFAULT 'private'`);
        this.logger.info('Added access_type column to files table');
      }

      // Migrate users table - add language preference and profile fields
      const usersHasLanguage = await this.columnExists('users', 'language');
      if (!usersHasLanguage) {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'en'`);
        this.logger.info('Added language column to users table');
      }

      const usersHasPhone = await this.columnExists('users', 'phone');
      if (!usersHasPhone) {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN phone VARCHAR(50)`);
        this.logger.info('Added phone column to users table');
      }

      const usersHasJobTitle = await this.columnExists('users', 'job_title');
      if (!usersHasJobTitle) {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN job_title VARCHAR(255)`);
        this.logger.info('Added job_title column to users table');
      }

      const usersHasOrganization = await this.columnExists('users', 'organization');
      if (!usersHasOrganization) {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN organization VARCHAR(255)`);
        this.logger.info('Added organization column to users table');
      }

      const usersHasBio = await this.columnExists('users', 'bio');
      if (!usersHasBio) {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN bio TEXT`);
        this.logger.info('Added bio column to users table');
      }

      // Migrate posts table for SEO metadata fields
      const postsHasMetaTitle = await this.columnExists('posts', 'meta_title');
      if (!postsHasMetaTitle) {
        await DatabaseUtils.executeQuery(`ALTER TABLE posts ADD COLUMN meta_title VARCHAR(255)`);
        this.logger.info('Added meta_title column to posts table');
      }

      const postsHasMetaDescription = await this.columnExists('posts', 'meta_description');
      if (!postsHasMetaDescription) {
        await DatabaseUtils.executeQuery(`ALTER TABLE posts ADD COLUMN meta_description TEXT`);
        this.logger.info('Added meta_description column to posts table');
      }

      const postsHasLikesCount = await this.columnExists('posts', 'likes_count');
      if (!postsHasLikesCount) {
        await DatabaseUtils.executeQuery(`ALTER TABLE posts ADD COLUMN likes_count INT DEFAULT 0`);
        this.logger.info('Added likes_count column to posts table');
      }

      const postsHasCommentsCount = await this.columnExists('posts', 'comments_count');
      if (!postsHasCommentsCount) {
        await DatabaseUtils.executeQuery(`ALTER TABLE posts ADD COLUMN comments_count INT DEFAULT 0`);
        this.logger.info('Added comments_count column to posts table');
      }

      const tablesToConvertCollation = [
        'posts',
        'tags',
        'post_tags',
        'post_subcategories',
        'post_authors',
        'post_attachments',
        'post_views',
        'users',
        'user_roles',
        'roles',
        'permissions',
        'role_permissions',
        'categories',
        'subcategories',
        'category_subcategories',
        'files',
        'folders',
        'folder_shares',
        'nav_links',
        'settings'
      ];

      for (const tableName of tablesToConvertCollation) {
        try {
          await DatabaseUtils.executeQuery(
            `ALTER TABLE ${tableName} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
          );
          this.logger.debug(`Converted table ${tableName} to utf8mb4_unicode_ci collation`);
        } catch (conversionError) {
          this.logger.warn(`Could not convert table ${tableName} collation`, conversionError as Error);
        }
      }
    } catch (error) {
      this.logger.error('Error during table migration', error as Error);
      // Don't throw - migration errors shouldn't stop initialization
    }
  }

  private async initializeTables(): Promise<void> {
    try {
      // Folders table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS folders (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          parent_id VARCHAR(36),
          user_id VARCHAR(36),
          access_type VARCHAR(20) DEFAULT 'private',
          is_public TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES folders (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
          INDEX idx_parent_id (parent_id),
          INDEX idx_user_id (user_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Files table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS files (
          id VARCHAR(36) PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255),
          file_path TEXT NOT NULL,
          thumbnail_path TEXT,
          file_size BIGINT,
          mime_type VARCHAR(255),
          folder_id VARCHAR(36),
          user_id VARCHAR(36),
          access_type VARCHAR(20) DEFAULT 'private',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
          INDEX idx_folder_id (folder_id),
          INDEX idx_user_id (user_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Users table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          phone VARCHAR(50),
          job_title VARCHAR(255),
          organization VARCHAR(255),
          bio TEXT,
          avatar TEXT,
          language VARCHAR(10) DEFAULT 'en',
          is_active TINYINT(1) DEFAULT 1,
          email_verified TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Add new columns if they don't exist (migration)
      try {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0`);
      } catch (e: any) {
        if (!e.message?.includes('Duplicate column name') && !e.message?.includes('ER_DUP_FIELDNAME')) {
          this.logger.warn('Failed to add email_verified column', { error: e.message });
        }
      }

      try {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
      } catch (e: any) {
        if (!e.message?.includes('Duplicate column name') && !e.message?.includes('ER_DUP_FIELDNAME')) {
          this.logger.warn('Failed to add last_login column', { error: e.message });
        }
      }

      try {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)`);
      } catch (e: any) {
        if (!e.message?.includes('Duplicate column name') && !e.message?.includes('ER_DUP_FIELDNAME')) {
          this.logger.warn('Failed to add password_reset_token column', { error: e.message });
        }
      }

      try {
        await DatabaseUtils.executeQuery(`ALTER TABLE users ADD COLUMN password_reset_expires DATETIME`);
      } catch (e: any) {
        if (!e.message?.includes('Duplicate column name') && !e.message?.includes('ER_DUP_FIELDNAME')) {
          this.logger.warn('Failed to add password_reset_expires column', { error: e.message });
        }
      }

      // Roles table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS roles (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_slug (slug)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Permissions table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS permissions (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_slug (slug)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // User roles junction table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36) NOT NULL,
          role_id VARCHAR(36) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_role (user_id, role_id),
          INDEX idx_user_id (user_id),
          INDEX idx_role_id (role_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Role permissions junction table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id VARCHAR(36) PRIMARY KEY,
          role_id VARCHAR(36) NOT NULL,
          permission_id VARCHAR(36) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
          UNIQUE KEY unique_role_permission (role_id, permission_id),
          INDEX idx_role_id (role_id),
          INDEX idx_permission_id (permission_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // File sharing table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS file_shares (
          id VARCHAR(36) PRIMARY KEY,
          file_id VARCHAR(36) NOT NULL,
          shared_with_user_id VARCHAR(36),
          access_level VARCHAR(20) DEFAULT 'read',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
          FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE,
          INDEX idx_file_id (file_id),
          INDEX idx_shared_with_user_id (shared_with_user_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Folder shares table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS folder_shares (
          id VARCHAR(36) PRIMARY KEY,
          folder_id VARCHAR(36) NOT NULL,
          shared_with_user_id VARCHAR(36) NOT NULL,
          access_type VARCHAR(20) DEFAULT 'readonly',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE,
          FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE KEY unique_folder_user (folder_id, shared_with_user_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Categories table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          cover_image TEXT,
          show_on_menu TINYINT(1) DEFAULT 1,
          menu_order INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_slug (slug)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Add cover_image column if it doesn't exist (migration)
      const categoriesColumns = await DatabaseUtils.findMany<any>(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'categories'`
      );
      const hasCoverImage = categoriesColumns.some((col: any) => col.COLUMN_NAME === 'cover_image');
      if (!hasCoverImage) {
        await DatabaseUtils.executeQuery(`ALTER TABLE categories ADD COLUMN cover_image TEXT`);
      }
      const hasShowOnMenu = categoriesColumns.some((col: any) => col.COLUMN_NAME === 'show_on_menu');
      if (!hasShowOnMenu) {
        await DatabaseUtils.executeQuery(`ALTER TABLE categories ADD COLUMN show_on_menu TINYINT(1) DEFAULT 1`);
      }
      const hasMenuOrder = categoriesColumns.some((col: any) => col.COLUMN_NAME === 'menu_order');
      if (!hasMenuOrder) {
        await DatabaseUtils.executeQuery(`ALTER TABLE categories ADD COLUMN menu_order INT DEFAULT 0`);
      }

      // Subcategories table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS subcategories (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_name_slug (name, slug)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Category subcategories junction table (many-to-many)
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS category_subcategories (
          id VARCHAR(36) PRIMARY KEY,
          category_id VARCHAR(36) NOT NULL,
          subcategory_id VARCHAR(36) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
          FOREIGN KEY (subcategory_id) REFERENCES subcategories (id) ON DELETE CASCADE,
          UNIQUE KEY unique_category_subcategory (category_id, subcategory_id),
          INDEX idx_category_id (category_id),
          INDEX idx_subcategory_id (subcategory_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Posts table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS posts (
          id VARCHAR(191) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          meta_title VARCHAR(255),
          meta_description TEXT,
          cover_image TEXT,
          category_id VARCHAR(36) NOT NULL,
          creator_id VARCHAR(36) NOT NULL,
          approved_by VARCHAR(36),
          status VARCHAR(20) DEFAULT 'pending',
          publication_date DATETIME,
          rejection_reason TEXT,
          has_comments TINYINT(1) DEFAULT 1,
          views INT DEFAULT 0,
          unique_hits INT DEFAULT 0,
          is_featured TINYINT(1) DEFAULT 0,
          is_leaderboard TINYINT(1) DEFAULT 0,
          likes_count INT DEFAULT 0,
          comments_count INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id),
          FOREIGN KEY (creator_id) REFERENCES users (id),
          FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
          INDEX idx_category_id (category_id),
          INDEX idx_creator_id (creator_id),
          INDEX idx_status (status),
          INDEX idx_is_featured (is_featured),
          INDEX idx_is_leaderboard (is_leaderboard),
          INDEX idx_publication_date (publication_date),
          INDEX idx_slug (slug)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Tags table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS tags (
          id VARCHAR(191) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_tag_name (name),
          UNIQUE KEY unique_tag_slug (slug),
          INDEX idx_tag_name (name)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Post tags junction table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS post_tags (
          id VARCHAR(191) PRIMARY KEY,
          post_id VARCHAR(191) NOT NULL,
          tag_id VARCHAR(191) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
          UNIQUE KEY unique_post_tag (post_id, tag_id),
          INDEX idx_post_id (post_id),
          INDEX idx_tag_id (tag_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Post subcategories junction table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS post_subcategories (
          id VARCHAR(36) PRIMARY KEY,
          post_id VARCHAR(36) NOT NULL,
          subcategory_id VARCHAR(36) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (subcategory_id) REFERENCES subcategories (id) ON DELETE CASCADE,
          UNIQUE KEY unique_post_subcategory (post_id, subcategory_id),
          INDEX idx_post_id (post_id),
          INDEX idx_subcategory_id (subcategory_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Post attachments junction table (files attached to posts)
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS post_attachments (
          id VARCHAR(36) PRIMARY KEY,
          post_id VARCHAR(36) NOT NULL,
          file_id VARCHAR(36) NOT NULL,
          display_order INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
          UNIQUE KEY unique_post_file (post_id, file_id),
          INDEX idx_post_id (post_id),
          INDEX idx_file_id (file_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Post authors junction table (associated authors)
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS post_authors (
          id VARCHAR(36) PRIMARY KEY,
          post_id VARCHAR(36) NOT NULL,
          author_id VARCHAR(36) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE KEY unique_post_author (post_id, author_id),
          INDEX idx_post_id (post_id),
          INDEX idx_author_id (author_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Post views tracking table (for unique hits)
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS post_views (
          id VARCHAR(36) PRIMARY KEY,
          post_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36),
          viewer_token VARCHAR(191),
          ip_address VARCHAR(45),
          user_agent TEXT,
          viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
          INDEX idx_post_id (post_id),
          INDEX idx_user_id (user_id),
          INDEX idx_post_viewer_token (post_id, viewer_token)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      const viewerTokenColumn = await DatabaseUtils.findMany<any>(`SHOW COLUMNS FROM post_views LIKE 'viewer_token'`);
      if (viewerTokenColumn.length === 0) {
        await DatabaseUtils.executeQuery(`ALTER TABLE post_views ADD COLUMN viewer_token VARCHAR(191)`);
      }

      // Add rejection_reason column to posts table if it doesn't exist
      const rejectionReasonColumn = await DatabaseUtils.findMany<any>(`SHOW COLUMNS FROM posts LIKE 'rejection_reason'`);
      if (rejectionReasonColumn.length === 0) {
        await DatabaseUtils.executeQuery(`ALTER TABLE posts ADD COLUMN rejection_reason TEXT`);
      }

      const postViewerIndex = await DatabaseUtils.findMany<any>(`SHOW INDEX FROM post_views WHERE Key_name = 'idx_post_viewer_token'`);
      if (postViewerIndex.length === 0) {
        await DatabaseUtils.executeQuery(`CREATE INDEX idx_post_viewer_token ON post_views (post_id, viewer_token)`);
      }

      const postUserIndex = await DatabaseUtils.findMany<any>(`SHOW INDEX FROM post_views WHERE Key_name = 'idx_post_user'`);
      if (postUserIndex.length === 0) {
        await DatabaseUtils.executeQuery(`CREATE INDEX idx_post_user ON post_views (post_id, user_id)`);
      }

      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id VARCHAR(191) PRIMARY KEY,
          post_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE KEY unique_post_user (post_id, user_id),
          INDEX idx_post_id (post_id),
          INDEX idx_user_id (user_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id VARCHAR(191) PRIMARY KEY,
          post_id VARCHAR(191) NOT NULL,
          user_id VARCHAR(36),
          author_name VARCHAR(255),
          author_email VARCHAR(255),
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
          INDEX idx_post_id (post_id),
          INDEX idx_user_id (user_id)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Navigation links table
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS nav_links (
          id VARCHAR(36) PRIMARY KEY,
          label VARCHAR(255) NOT NULL,
          url VARCHAR(255),
          route VARCHAR(255),
          external TINYINT(1) DEFAULT 0,
          display_order INT DEFAULT 0,
          is_active TINYINT(1) DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Settings table (stores site configuration as JSON)
      await DatabaseUtils.executeQuery(`
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(36) PRIMARY KEY,
          \`key\` VARCHAR(255) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_key (\`key\`)
        )
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      // Run migrations for existing tables (must happen before index creation)
      await this.migrateTables();

      // Insert default categories (using fixed UUIDs for consistency)
      await DatabaseUtils.executeQuery(`
        INSERT IGNORE INTO categories (id, name, slug, created_at, updated_at) VALUES
        ('550e8400-e29b-41d4-a716-446655440001', 'Videos', 'videos', NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440002', 'Audios', 'audios', NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440003', 'Photos', 'photos', NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440004', 'Infographics', 'infographics', NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440005', 'Documents', 'documents', NOW(), NOW()),
        ('550e8400-e29b-41d4-a716-446655440006', 'Other', 'other', NOW(), NOW())
      `);

      // Seed default roles, permissions, and admin user
      await this.seedDefaultData();

      this.logger.info('Database tables initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database tables', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to initialize tables', 'init', 'all');
    }
  }

  /**
   * Seed default roles, permissions, and admin user
   */
  private async seedDefaultData(): Promise<void> {
    try {
      // Default roles (using fixed UUIDs)
      const adminRoleId = '00000000-0000-0000-0000-000000000001';
      const authorRoleId = '00000000-0000-0000-0000-000000000002';
      
      await DatabaseUtils.executeQuery(`
        INSERT IGNORE INTO roles (id, name, slug, description, created_at, updated_at) VALUES
        (?, 'Admin', 'admin', 'Administrator with full access', NOW(), NOW()),
        (?, 'Author', 'author', 'Content author with create/edit permissions', NOW(), NOW())
      `, [adminRoleId, authorRoleId]);

      // Default permissions
      const permissions = [
        { id: '10000000-0000-0000-0000-000000000001', name: 'Manage Users', slug: 'users:manage' },
        { id: '10000000-0000-0000-0000-000000000002', name: 'Manage Roles', slug: 'roles:manage' },
        { id: '10000000-0000-0000-0000-000000000003', name: 'Create Posts', slug: 'posts:create' },
        { id: '10000000-0000-0000-0000-000000000004', name: 'Edit Posts', slug: 'posts:edit' },
        { id: '10000000-0000-0000-0000-000000000005', name: 'Delete Posts', slug: 'posts:delete' },
        { id: '10000000-0000-0000-0000-000000000006', name: 'Approve Posts', slug: 'posts:approve' },
        { id: '10000000-0000-0000-0000-000000000007', name: 'Manage Categories', slug: 'categories:manage' },
        { id: '10000000-0000-0000-0000-000000000008', name: 'Manage Files', slug: 'files:manage' },
      ];

      for (const perm of permissions) {
        await DatabaseUtils.executeQuery(`
          INSERT IGNORE INTO permissions (id, name, slug, description, created_at, updated_at) VALUES
          (?, ?, ?, ?, NOW(), NOW())
        `, [perm.id, perm.name, perm.slug, `${perm.name} permission`]);
      }

      // Assign all permissions to admin role
      for (const perm of permissions) {
        await DatabaseUtils.executeQuery(`
          INSERT IGNORE INTO role_permissions (id, role_id, permission_id, created_at) VALUES
          (?, ?, ?, NOW())
        `, [DatabaseUtils.generateId(), adminRoleId, perm.id]);
      }

      // Assign basic permissions to author role
      const authorPerms = permissions.filter(p => 
        p.slug.startsWith('posts:create') || 
        p.slug.startsWith('posts:edit') ||
        p.slug.startsWith('files:manage')
      );
      for (const perm of authorPerms) {
        await DatabaseUtils.executeQuery(`
          INSERT IGNORE INTO role_permissions (id, role_id, permission_id, created_at) VALUES
          (?, ?, ?, NOW())
        `, [DatabaseUtils.generateId(), authorRoleId, perm.id]);
      }

      // Create default admin user (password: admin123)
      const adminUserId = '20000000-0000-0000-0000-000000000001';
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      
      // Check if admin user already exists
      const existingAdmin = await DatabaseUtils.findOne<any>(
        'SELECT id FROM users WHERE id = ? OR email = ?',
        [adminUserId, 'admin@example.com']
      );
      
      if (!existingAdmin) {
        // Use DatabaseUtils for parameterized queries
        await DatabaseUtils.executeQuery(
          `INSERT INTO users (id, username, email, password, first_name, last_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [adminUserId, 'admin', 'admin@example.com', adminPasswordHash, 'Admin', 'User', 1]
        );

        // Assign admin role to admin user (admin role already has all permissions)
        const userRoleId = DatabaseUtils.generateId();
        await DatabaseUtils.executeQuery(`
          INSERT IGNORE INTO user_roles (id, user_id, role_id, created_at) VALUES
          (?, ?, ?, NOW())
        `, [userRoleId, adminUserId, adminRoleId]);

        this.logger.info('Default admin user created with admin role (all permissions)', { 
          email: 'admin@example.com',
          username: 'admin',
          role: 'admin'
        });
      } else {
        // Ensure existing admin user has admin role
        const existingRole = await DatabaseUtils.findOne<any>(
          'SELECT ur.id FROM user_roles ur WHERE ur.user_id = ? AND ur.role_id = ?',
          [adminUserId, adminRoleId]
        );
        
        if (!existingRole) {
          const userRoleId = DatabaseUtils.generateId();
          await DatabaseUtils.executeQuery(`
            INSERT IGNORE INTO user_roles (id, user_id, role_id, created_at) VALUES
            (?, ?, ?, NOW())
          `, [userRoleId, adminUserId, adminRoleId]);
          this.logger.info('Admin role assigned to existing admin user');
        }
        this.logger.debug('Admin user already exists');
      }

      // Create test users for sharing functionality
      const testUsers = [
        {
          id: '30000000-0000-0000-0000-000000000001',
          username: 'testuser1',
          email: 'testuser1@example.com',
          password: 'test123',
          firstName: 'Test',
          lastName: 'User One'
        },
        {
          id: '30000000-0000-0000-0000-000000000002',
          username: 'testuser2',
          email: 'testuser2@example.com',
          password: 'test123',
          firstName: 'Test',
          lastName: 'User Two'
        }
      ];

      for (const testUser of testUsers) {
        const existing = await DatabaseUtils.findOne<any>(
          'SELECT id FROM users WHERE id = ? OR email = ?',
          [testUser.id, testUser.email]
        );

        if (!existing) {
          const passwordHash = await bcrypt.hash(testUser.password, 10);
          await DatabaseUtils.executeQuery(
            `INSERT INTO users (id, username, email, password, first_name, last_name, is_active, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [testUser.id, testUser.username, testUser.email, passwordHash, testUser.firstName, testUser.lastName, 1, 'en']
          );

          // Assign author role to test users
          const userRoleId = DatabaseUtils.generateId();
          await DatabaseUtils.executeQuery(`
            INSERT IGNORE INTO user_roles (id, user_id, role_id, created_at) VALUES
            (?, ?, ?, NOW())
          `, [userRoleId, testUser.id, authorRoleId]);

          this.logger.info('Test user created', {
            email: testUser.email,
            username: testUser.username,
            role: 'author'
          });
        } else {
          this.logger.debug('Test user already exists', { email: testUser.email });
        }
      }

    } catch (error) {
      this.logger.error('Failed to seed default data', error as Error);
      // Don't throw - seeding failures shouldn't stop initialization
    }
  }

  getDatabase(): mysql.Pool {
    return this.pool;
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.info('Database connection pool closed');
    } catch (error) {
      this.logger.error('Error closing database pool', error as Error);
      throw error;
    }
  }
}