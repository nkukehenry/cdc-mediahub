// Cache interfaces for Redis implementation
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  delPattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<boolean>;
  isConnected(): boolean;
}

export interface ICacheStrategy {
  getCacheKey(entity: string, id: string, userId?: string): string;
  getPatternKey(entity: string, userId?: string): string;
  shouldCache(entity: string): boolean;
  getTTL(entity: string): number;
}

export interface ICacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
}
