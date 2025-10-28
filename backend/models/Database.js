const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = new sqlite3.Database('./database.sqlite');
    this.init();
  }

  init() {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Folders table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER,
          user_id INTEGER NOT NULL,
          is_public BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES folders (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Files table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          thumbnail_path TEXT,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          folder_id INTEGER,
          user_id INTEGER NOT NULL,
          is_public BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Create default admin user
      this.createDefaultUser();
    });
  }

  async createDefaultUser() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    this.db.run(`
      INSERT OR IGNORE INTO users (username, email, password, role) 
      VALUES ('admin', 'admin@filemanager.com', ?, 'admin')
    `, [hashedPassword]);
  }

  // User methods
  async createUser(username, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, username, email });
        }
      );
    });
  }

  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Folder methods
  async createFolder(name, parentId, userId, isPublic = false) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO folders (name, parent_id, user_id, is_public) VALUES (?, ?, ?, ?)',
        [name, parentId, userId, isPublic],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, name, parentId, userId, isPublic });
        }
      );
    });
  }

  async getFolders(userId, parentId = null) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM folders WHERE user_id = ? AND parent_id = ? ORDER BY name',
        [userId, parentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async getPublicFolders(parentId = null) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM folders WHERE is_public = 1 AND parent_id = ? ORDER BY name',
        [parentId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // File methods
  async createFile(fileData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO files (filename, original_name, file_path, thumbnail_path, 
         file_size, mime_type, folder_id, user_id, is_public) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileData.filename,
          fileData.originalName,
          fileData.filePath,
          fileData.thumbnailPath,
          fileData.fileSize,
          fileData.mimeType,
          fileData.folderId,
          fileData.userId,
          fileData.isPublic
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...fileData });
        }
      );
    });
  }

  async getFiles(userId, folderId = null, isPublic = false) {
    let query = 'SELECT * FROM files WHERE ';
    let params = [];
    
    if (isPublic) {
      query += 'is_public = 1 AND ';
    } else {
      query += 'user_id = ? AND ';
      params.push(userId);
    }
    
    query += 'folder_id = ? ORDER BY created_at DESC';
    params.push(folderId);

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getFileById(id, userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM files WHERE id = ? AND (user_id = ? OR is_public = 1)',
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async deleteFile(id, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM files WHERE id = ? AND user_id = ?',
        [id, userId],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
