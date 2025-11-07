import sqlite3 from 'sqlite3';
import { promisify } from 'util';
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
  private db: sqlite3.Database;
  private logger = getLogger('DatabaseConnection');
  private errorHandler = getErrorHandler();

  constructor(private dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    // Enforce foreign key constraints for cascading deletes
    try {
      this.db.run('PRAGMA foreign_keys = ON');
    } catch {}
    this.initializeTables();
  }

  /**
   * Check if a column exists in a table
   */
  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const info = await new Promise<any[]>((resolve, reject) => {
        this.db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
          if (err) {
            // Table might not exist yet, return false
            resolve([]);
          } else {
            resolve(rows as any[]);
          }
        });
      });
      
      return info.some(col => col.name === columnName);
    } catch (error) {
      this.logger.warn(`Error checking column ${columnName} in ${tableName}`, error as Error);
      return false;
    }
  }

  /**
   * Migrate existing tables to add new columns
   */
  private async migrateTables(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      // Migrate folders table
      const foldersHasUserId = await this.columnExists('folders', 'user_id');
      const foldersHasAccessType = await this.columnExists('folders', 'access_type');
      const foldersHasIsPublic = await this.columnExists('folders', 'is_public');
      
      if (!foldersHasUserId) {
        await run(`ALTER TABLE folders ADD COLUMN user_id TEXT`);
        this.logger.info('Added user_id column to folders table');
      }
      
      if (!foldersHasAccessType) {
        await run(`ALTER TABLE folders ADD COLUMN access_type TEXT DEFAULT 'private'`);
        this.logger.info('Added access_type column to folders table');
      }
      if (!foldersHasIsPublic) {
        await run(`ALTER TABLE folders ADD COLUMN is_public INTEGER DEFAULT 0`);
        this.logger.info('Added is_public column to folders table');
      }

      // Migrate files table
      const filesHasUserId = await this.columnExists('files', 'user_id');
      const filesHasAccessType = await this.columnExists('files', 'access_type');
      
      if (!filesHasUserId) {
        await run(`ALTER TABLE files ADD COLUMN user_id TEXT`);
        this.logger.info('Added user_id column to files table');
      }
      
      if (!filesHasAccessType) {
        await run(`ALTER TABLE files ADD COLUMN access_type TEXT DEFAULT 'private'`);
        this.logger.info('Added access_type column to files table');
      }

      // Migrate users table - add language preference and profile fields
      const usersHasLanguage = await this.columnExists('users', 'language');
      if (!usersHasLanguage) {
        await run(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en' CHECK(language IN ('ar', 'en', 'fr', 'pt', 'es', 'sw'))`);
        this.logger.info('Added language column to users table');
      }

      const usersHasPhone = await this.columnExists('users', 'phone');
      if (!usersHasPhone) {
        await run(`ALTER TABLE users ADD COLUMN phone TEXT`);
        this.logger.info('Added phone column to users table');
      }

      const usersHasJobTitle = await this.columnExists('users', 'job_title');
      if (!usersHasJobTitle) {
        await run(`ALTER TABLE users ADD COLUMN job_title TEXT`);
        this.logger.info('Added job_title column to users table');
      }

      const usersHasOrganization = await this.columnExists('users', 'organization');
      if (!usersHasOrganization) {
        await run(`ALTER TABLE users ADD COLUMN organization TEXT`);
        this.logger.info('Added organization column to users table');
      }

      const usersHasBio = await this.columnExists('users', 'bio');
      if (!usersHasBio) {
        await run(`ALTER TABLE users ADD COLUMN bio TEXT`);
        this.logger.info('Added bio column to users table');
      }
    } catch (error) {
      this.logger.error('Error during table migration', error as Error);
      // Don't throw - migration errors shouldn't stop initialization
    }
  }

  private async initializeTables(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      // Folders table
      await run(`
        CREATE TABLE IF NOT EXISTS folders (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          parent_id TEXT,
          user_id TEXT,
          access_type TEXT DEFAULT 'private' CHECK(access_type IN ('private', 'public', 'shared')),
          is_public INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES folders (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Files table
      await run(`
        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          thumbnail_path TEXT,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          folder_id TEXT,
          user_id TEXT,
          access_type TEXT DEFAULT 'private' CHECK(access_type IN ('private', 'public', 'shared')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Users table
      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          avatar TEXT,
          phone TEXT,
          job_title TEXT,
          organization TEXT,
          bio TEXT,
          is_active BOOLEAN DEFAULT 1,
          email_verified BOOLEAN DEFAULT 0,
          language TEXT DEFAULT 'en' CHECK(language IN ('ar', 'en', 'fr', 'pt', 'es', 'sw')),
          last_login DATETIME,
          password_reset_token TEXT,
          password_reset_expires DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add new columns if they don't exist (migration)
      try {
        await run(`ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0`);
      } catch (e: any) {
        // Column already exists, ignore
        if (!e.message?.includes('duplicate column name')) {
          this.logger.warn('Failed to add email_verified column', { error: e.message });
        }
      }

      try {
        await run(`ALTER TABLE users ADD COLUMN last_login DATETIME`);
      } catch (e: any) {
        if (!e.message?.includes('duplicate column name')) {
          this.logger.warn('Failed to add last_login column', { error: e.message });
        }
      }

      try {
        await run(`ALTER TABLE users ADD COLUMN password_reset_token TEXT`);
      } catch (e: any) {
        if (!e.message?.includes('duplicate column name')) {
          this.logger.warn('Failed to add password_reset_token column', { error: e.message });
        }
      }

      try {
        await run(`ALTER TABLE users ADD COLUMN password_reset_expires DATETIME`);
      } catch (e: any) {
        if (!e.message?.includes('duplicate column name')) {
          this.logger.warn('Failed to add password_reset_expires column', { error: e.message });
        }
      }

      // Roles table
      await run(`
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Permissions table
      await run(`
        CREATE TABLE IF NOT EXISTS permissions (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User roles junction table
      await run(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
          UNIQUE(user_id, role_id)
        )
      `);

      // Role permissions junction table
      await run(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id TEXT PRIMARY KEY,
          role_id TEXT NOT NULL,
          permission_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
          UNIQUE(role_id, permission_id)
        )
      `);

      // File sharing table
      await run(`
        CREATE TABLE IF NOT EXISTS file_shares (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL,
          shared_with_user_id TEXT,
          access_level TEXT DEFAULT 'read' CHECK(access_level IN ('read', 'write')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
          FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Ensure a Public folder exists
      try {
        const existingPublic = await DatabaseUtils.findOne<any>('SELECT id FROM folders WHERE is_public = 1 LIMIT 1');
        let pubId = existingPublic?.id;
        if (!pubId) {
          pubId = uuidv4();
          await run(`INSERT INTO folders (id, name, parent_id, user_id, access_type, is_public, created_at, updated_at) VALUES ('${pubId}', 'Public', NULL, NULL, 'public', 1, datetime('now'), datetime('now'))`);
          this.logger.info('Created Public folder');
        }
        // Create initial subfolders if none exist
        const hasChildren = await DatabaseUtils.findOne<any>('SELECT id FROM folders WHERE parent_id = ? LIMIT 1', [pubId]);
        if (!hasChildren) {
          const names = ['Images', 'Videos', 'Audios', 'Documents'];
          for (const n of names) {
            await run(`INSERT INTO folders (id, name, parent_id, user_id, access_type, is_public, created_at, updated_at) VALUES ('${uuidv4()}', '${n}', '${pubId}', NULL, 'public', 1, datetime('now'), datetime('now'))`);
          }
          this.logger.info('Seeded initial public subfolders');
        }
      } catch {}

      // Folder sharing table
      await run(`
        CREATE TABLE IF NOT EXISTS folder_shares (
          id TEXT PRIMARY KEY,
          folder_id TEXT NOT NULL,
          shared_with_user_id TEXT,
          access_level TEXT DEFAULT 'write' CHECK(access_level IN ('read', 'write')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE,
          FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Categories table
      await run(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          cover_image TEXT,
          show_on_menu INTEGER DEFAULT 1,
          menu_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add cover_image column if it doesn't exist (migration)
      const categoriesColumns = await DatabaseUtils.findMany<any>(
        `PRAGMA table_info(categories)`
      );
      const hasCoverImage = categoriesColumns.some((col: any) => col.name === 'cover_image');
      if (!hasCoverImage) {
        await run(`ALTER TABLE categories ADD COLUMN cover_image TEXT`);
      }
      const hasShowOnMenu = categoriesColumns.some((col: any) => col.name === 'show_on_menu');
      if (!hasShowOnMenu) {
        await run(`ALTER TABLE categories ADD COLUMN show_on_menu INTEGER DEFAULT 1`);
      }
      const hasMenuOrder = categoriesColumns.some((col: any) => col.name === 'menu_order');
      if (!hasMenuOrder) {
        await run(`ALTER TABLE categories ADD COLUMN menu_order INTEGER DEFAULT 0`);
      }

      // Subcategories table
      await run(`
        CREATE TABLE IF NOT EXISTS subcategories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name, slug)
        )
      `);

      // Category subcategories junction table (many-to-many)
      await run(`
        CREATE TABLE IF NOT EXISTS category_subcategories (
          id TEXT PRIMARY KEY,
          category_id TEXT NOT NULL,
          subcategory_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
          FOREIGN KEY (subcategory_id) REFERENCES subcategories (id) ON DELETE CASCADE,
          UNIQUE(category_id, subcategory_id)
        )
      `);

      // Posts table
      await run(`
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT,
          meta_title TEXT,
          meta_description TEXT,
          cover_image TEXT,
          category_id TEXT NOT NULL,
          creator_id TEXT NOT NULL,
          approved_by TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'rejected', 'approved', 'draft')),
          publication_date DATETIME,
          has_comments BOOLEAN DEFAULT 1,
          views INTEGER DEFAULT 0,
          unique_hits INTEGER DEFAULT 0,
          is_featured BOOLEAN DEFAULT 0,
          is_leaderboard BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id),
          FOREIGN KEY (creator_id) REFERENCES users (id),
          FOREIGN KEY (approved_by) REFERENCES users (id)
        )
      `);

      // Post subcategories junction table
      await run(`
        CREATE TABLE IF NOT EXISTS post_subcategories (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          subcategory_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (subcategory_id) REFERENCES subcategories (id) ON DELETE CASCADE,
          UNIQUE(post_id, subcategory_id)
        )
      `);

      // Post attachments junction table (files attached to posts)
      await run(`
        CREATE TABLE IF NOT EXISTS post_attachments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          file_id TEXT NOT NULL,
          display_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE,
          UNIQUE(post_id, file_id)
        )
      `);

      // Post authors junction table (associated authors)
      await run(`
        CREATE TABLE IF NOT EXISTS post_authors (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(post_id, author_id)
        )
      `);

      // Post views tracking table (for unique hits)
      await run(`
        CREATE TABLE IF NOT EXISTS post_views (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          user_id TEXT,
          ip_address TEXT,
          user_agent TEXT,
          viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `);

      // Navigation links table
      await run(`
        CREATE TABLE IF NOT EXISTS nav_links (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          url TEXT,
          route TEXT,
          external INTEGER DEFAULT 0,
          display_order INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Settings table (stores site configuration as JSON)
      await run(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Run migrations for existing tables (must happen before index creation)
      await this.migrateTables();

      // Create indexes for performance
      await run(`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_files_access_type ON files(access_type)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_file_shares_user_id ON file_shares(shared_with_user_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_folder_shares_folder_id ON folder_shares(folder_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_folder_shares_user_id ON folder_shares(shared_with_user_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON posts(creator_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_posts_leaderboard ON posts(is_leaderboard)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_posts_publication_date ON posts(publication_date)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id)`);
      await run(`CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id)`);

      // Insert default categories (using fixed UUIDs for consistency)
      await run(`
        INSERT OR IGNORE INTO categories (id, name, slug) VALUES
        ('550e8400-e29b-41d4-a716-446655440001', 'Videos', 'videos'),
        ('550e8400-e29b-41d4-a716-446655440002', 'Audios', 'audios'),
        ('550e8400-e29b-41d4-a716-446655440003', 'Photos', 'photos'),
        ('550e8400-e29b-41d4-a716-446655440004', 'Infographics', 'infographics'),
        ('550e8400-e29b-41d4-a716-446655440005', 'Documents', 'documents'),
        ('550e8400-e29b-41d4-a716-446655440006', 'Other', 'other')
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
    const run = promisify(this.db.run.bind(this.db));
    
    try {
      // Default roles (using fixed UUIDs)
      const adminRoleId = '00000000-0000-0000-0000-000000000001';
      const authorRoleId = '00000000-0000-0000-0000-000000000002';
      
      await run(`
        INSERT OR IGNORE INTO roles (id, name, slug, description) VALUES
        ('${adminRoleId}', 'Admin', 'admin', 'Administrator with full access'),
        ('${authorRoleId}', 'Author', 'author', 'Content author with create/edit permissions')
      `);

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
        await run(`
          INSERT OR IGNORE INTO permissions (id, name, slug, description) VALUES
          ('${perm.id}', '${perm.name}', '${perm.slug}', '${perm.name} permission')
        `);
      }

      // Assign all permissions to admin role
      for (const perm of permissions) {
        await run(`
          INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
          ('${DatabaseUtils.generateId()}', '${adminRoleId}', '${perm.id}')
        `);
      }

      // Assign basic permissions to author role
      const authorPerms = permissions.filter(p => 
        p.slug.startsWith('posts:create') || 
        p.slug.startsWith('posts:edit') ||
        p.slug.startsWith('files:manage')
      );
      for (const perm of authorPerms) {
        await run(`
          INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id) VALUES
          ('${DatabaseUtils.generateId()}', '${authorRoleId}', '${perm.id}')
        `);
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
          `INSERT INTO users (id, username, email, password, first_name, last_name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [adminUserId, 'admin', 'admin@example.com', adminPasswordHash, 'Admin', 'User', 1]
        );

        // Assign admin role to admin user (admin role already has all permissions)
        const userRoleId = DatabaseUtils.generateId();
        await run(`
          INSERT OR IGNORE INTO user_roles (id, user_id, role_id) VALUES
          ('${userRoleId}', '${adminUserId}', '${adminRoleId}')
        `);

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
          await run(`
            INSERT OR IGNORE INTO user_roles (id, user_id, role_id) VALUES
            ('${userRoleId}', '${adminUserId}', '${adminRoleId}')
          `);
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
            `INSERT INTO users (id, username, email, password, first_name, last_name, is_active, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [testUser.id, testUser.username, testUser.email, passwordHash, testUser.firstName, testUser.lastName, 1, 'en']
          );

          // Assign author role to test users
          const userRoleId = DatabaseUtils.generateId();
          await run(`
            INSERT OR IGNORE INTO user_roles (id, user_id, role_id) VALUES
            ('${userRoleId}', '${testUser.id}', '${authorRoleId}')
          `);

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

  getDatabase(): sqlite3.Database {
    return this.db;
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) {
          this.logger.error('Error closing database', err);
          reject(err);
        } else {
          this.logger.info('Database connection closed');
          resolve();
        }
      });
    });
  }
}