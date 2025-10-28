import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
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

export class DatabaseConnection {
  private db: sqlite3.Database;
  private logger = getLogger('DatabaseConnection');
  private errorHandler = getErrorHandler();

  constructor(private dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.initializeTables();
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES folders (id)
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders (id)
        )
      `);

      this.logger.info('Database tables initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database tables', error as Error);
      throw this.errorHandler.createDatabaseError('Failed to initialize tables', 'init', 'all');
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