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
    const values = keys.map(key => data[key]);
    
    return { columns, placeholders, values };
  }

  static buildUpdateSet(data: Record<string, any>): { set: string; values: any[] } {
    const keys = Object.keys(data);
    const set = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => data[key]);
    
    return { set, values };
  }
}
