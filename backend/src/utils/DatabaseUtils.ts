import mysql from 'mysql2/promise';

export interface RunResult {
  lastID: number;
  changes: number;
}

export class DatabaseUtils {
  private static pool: mysql.Pool;

  static initialize(pool: mysql.Pool): void {
    this.pool = pool;
  }

  static async executeQuery(sql: string, params: any[] = []): Promise<RunResult> {
    const [result]: any = await this.pool.execute(sql, params);
    return {
      lastID: result.insertId || 0,
      changes: result.affectedRows || 0
    };
  }

  static async findOne<T>(sql: string, params: any[] = []): Promise<T | null> {
    const [rows]: any = await this.pool.execute(sql, params);
    return (rows && rows.length > 0) ? rows[0] as T : null;
  }

  static async findMany<T>(sql: string, params: any[] = []): Promise<T[]> {
    const [rows]: any = await this.pool.execute(sql, params);
    return (rows || []) as T[];
  }

  static generateId(): string {
    return require('uuid').v4();
  }

  static getCurrentTimestamp(): string {
    const now = new Date();

    const pad = (value: number, length = 2) => value.toString().padStart(length, '0');

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const milliseconds = pad(now.getMilliseconds(), 3);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * Format a Date object or date string to MySQL DATETIME format: YYYY-MM-DD HH:mm:ss.SSS
   * @param date - Date object or date string (ISO format or MySQL DATETIME format)
   * @returns Formatted date string in MySQL DATETIME format
   */
  static formatDateTime(date: Date | string): string {
    // If it's already in MySQL DATETIME format (YYYY-MM-DD HH:mm:ss.SSS), return as-is
    if (typeof date === 'string') {
      const mysqlDateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/;
      if (mysqlDateTimeRegex.test(date.trim())) {
        // Ensure milliseconds are 3 digits
        const parts = date.trim().split('.');
        if (parts.length === 2) {
          const milliseconds = parts[1].padEnd(3, '0').substring(0, 3);
          return `${parts[0]}.${milliseconds}`;
        } else {
          return `${date.trim()}.000`;
        }
      }
    }

    // Parse the date string or use the Date object
    let dateObj: Date;
    if (typeof date === 'string') {
      // Check if it's an ISO format string (contains 'T' or 'Z')
      if (date.includes('T') || date.includes('Z')) {
        // ISO format - parse normally
        dateObj = new Date(date);
      } else {
        // MySQL DATETIME format or similar - parse as UTC to avoid timezone conversion
        // Replace space with 'T' and append 'Z' to indicate UTC
        const isoString = date.trim().replace(' ', 'T') + (date.includes('Z') ? '' : 'Z');
        dateObj = new Date(isoString);
      }
    } else {
      dateObj = date;
    }
    
    if (Number.isNaN(dateObj.getTime())) {
      throw new Error(`Invalid date: ${date}`);
    }

    // Use UTC methods to format the date consistently
    const pad = (value: number, length = 2) => value.toString().padStart(length, '0');

    const year = dateObj.getUTCFullYear();
    const month = pad(dateObj.getUTCMonth() + 1);
    const day = pad(dateObj.getUTCDate());
    const hours = pad(dateObj.getUTCHours());
    const minutes = pad(dateObj.getUTCMinutes());
    const seconds = pad(dateObj.getUTCSeconds());
    const milliseconds = pad(dateObj.getUTCMilliseconds(), 3);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  static buildWhereClause(conditions: Record<string, any>): { clause: string; params: any[] } {
    const keys = Object.keys(conditions);
    if (keys.length === 0) {
      return { clause: '', params: [] };
    }

    const clause = keys.map(key => `${key} = ?`).join(' AND ');
    const params = keys.map(key => conditions[key]);
    
    return { clause, params };
  }

  static buildInsertValues(data: Record<string, any>): { columns: string; placeholders: string; values: any[] } {
    const keys = Object.keys(data);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    // Convert undefined to null for MySQL compatibility
    const values = keys.map(key => data[key] === undefined ? null : data[key]);
    
    return { columns, placeholders, values };
  }

  static buildUpdateSet(data: Record<string, any>): { set: string; values: any[] } {
    const keys = Object.keys(data);
    const set = keys.map(key => `${key} = ?`).join(', ');
    // Convert undefined to null for MySQL compatibility
    const values = keys.map(key => data[key] === undefined ? null : data[key]);
    
    return { set, values };
  }
}
