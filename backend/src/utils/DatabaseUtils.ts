import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class DatabaseUtils {
  private static run: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
  private static get: (sql: string, params?: any[]) => Promise<any>;
  private static all: (sql: string, params?: any[]) => Promise<any[]>;

  static initialize(db: sqlite3.Database): void {
    this.run = promisify(db.run.bind(db));
    this.get = promisify(db.get.bind(db));
    this.all = promisify(db.all.bind(db));
  }

  static async executeQuery(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return this.run(sql, params);
  }

  static async findOne<T>(sql: string, params: any[] = []): Promise<T | null> {
    return this.get(sql, params);
  }

  static async findMany<T>(sql: string, params: any[] = []): Promise<T[]> {
    return this.all(sql, params);
  }

  static generateId(): string {
    return require('uuid').v4();
  }

  static getCurrentTimestamp(): string {
    return new Date().toISOString();
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
