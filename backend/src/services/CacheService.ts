import Redis from 'ioredis';
import { ICacheService, ICacheStrategy, ICacheConfig } from '../interfaces/Cache';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';

export class RedisCacheService implements ICacheService {
  private redis: Redis | null = null;
  private connected: boolean = false;
  private logger = getLogger('RedisCache');
  private errorHandler = getErrorHandler();

  constructor(private config: ICacheConfig) {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db || 0,
        lazyConnect: this.config.lazyConnect !== false,
        enableReadyCheck: this.config.enableReadyCheck !== false,
        enableOfflineQueue: this.config.enableOfflineQueue !== false
      });

      this.redis.on('connect', () => {
        this.logger.info('Redis connected successfully');
        this.connected = true;
      });

      this.redis.on('ready', () => {
        this.logger.info('Redis ready for operations');
        this.connected = true;
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error', error);
        this.connected = false;
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.connected = false;
      });

      this.redis.on('reconnecting', () => {
        this.logger.info('Redis reconnecting...');
      });

      // Test connection
      await this.redis.ping();
      this.logger.info('Redis ping successful');
    } catch (error) {
      this.logger.error('Failed to initialize Redis', error as Error);
      this.connected = false;
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.redis) {
      this.logger.debug('Redis not available, returning null for key', { key });
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value === null) {
        this.logger.debug('Cache miss', { key });
        return null;
      }

      this.logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Error getting from cache', error as Error, { key });
      this.errorHandler.handle(error as Error, { operation: 'cache_get', key });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.connected || !this.redis) {
      this.logger.debug('Redis not available, skipping set for key', { key });
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      this.logger.debug('Cache set successful', { key, ttlSeconds });
      return true;
    } catch (error) {
      this.logger.error('Error setting cache', error as Error, { key, ttlSeconds });
      this.errorHandler.handle(error as Error, { operation: 'cache_set', key, ttlSeconds });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.connected || !this.redis) {
      this.logger.debug('Redis not available, skipping delete for key', { key });
      return false;
    }

    try {
      const result = await this.redis.del(key);
      this.logger.debug('Cache delete successful', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      this.logger.error('Error deleting from cache', error as Error, { key });
      this.errorHandler.handle(error as Error, { operation: 'cache_del', key });
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    if (!this.connected || !this.redis) {
      this.logger.debug('Redis not available, skipping pattern delete', { pattern });
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        this.logger.debug('No keys found for pattern', { pattern });
        return 0;
      }

      const result = await this.redis.del(...keys);
      this.logger.debug('Cache pattern delete successful', { pattern, deleted: result });
      return result;
    } catch (error) {
      this.logger.error('Error deleting pattern from cache', error as Error, { pattern });
      this.errorHandler.handle(error as Error, { operation: 'cache_del_pattern', pattern });
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected || !this.redis) {
      this.logger.debug('Redis not available, returning false for exists check', { key });
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      this.logger.debug('Cache exists check', { key, exists: result > 0 });
      return result > 0;
    } catch (error) {
      this.logger.error('Error checking cache existence', error as Error, { key });
      this.errorHandler.handle(error as Error, { operation: 'cache_exists', key });
      return false;
    }
  }

  async flush(): Promise<boolean> {
    if (!this.connected || !this.redis) {
      this.logger.debug('Redis not available, skipping flush');
      return false;
    }

    try {
      await this.redis.flushdb();
      this.logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error flushing cache', error as Error);
      this.errorHandler.handle(error as Error, { operation: 'cache_flush' });
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getRedisInstance(): Redis | null {
    return this.redis;
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.connected = false;
      this.logger.info('Redis disconnected');
    }
  }
}

// Fallback cache service for when Redis is not available
export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, { value: any; expires?: number }>();
  private logger = getLogger('MemoryCache');

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.logger.debug('Memory cache miss', { key });
      return null;
    }

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      this.logger.debug('Memory cache expired', { key });
      return null;
    }

    this.logger.debug('Memory cache hit', { key });
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.cache.set(key, { value, expires });
    this.logger.debug('Memory cache set', { key, ttlSeconds });
    return true;
  }

  async del(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    this.logger.debug('Memory cache delete', { key, deleted });
    return deleted;
  }

  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.logger.debug('Memory cache pattern delete', { pattern, deleted });
    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    const exists = this.cache.has(key);
    this.logger.debug('Memory cache exists check', { key, exists });
    return exists;
  }

  async flush(): Promise<boolean> {
    this.cache.clear();
    this.logger.info('Memory cache flushed');
    return true;
  }

  isConnected(): boolean {
    return true; // Memory cache is always "connected"
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  getKeyInfo(key: string): { ttl: number | null; exists: boolean } | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    const ttl = item.expires ? Math.max(0, Math.floor((item.expires - Date.now()) / 1000)) : null;
    return { ttl, exists: true };
  }

  getRedisInstance(): null {
    return null; // Memory cache doesn't use Redis
  }
}

// Cache strategy implementation
export class FileManagerCacheStrategy implements ICacheStrategy {
  private readonly CACHE_PREFIX = 'mutindo:filemanager';
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly ENTITY_TTL: Record<string, number> = {
    'user': 1800,      // 30 minutes
    'file': 3600,      // 1 hour
    'folder': 3600,    // 1 hour
    'files': 300,      // 5 minutes (for file lists)
    'folders': 300,    // 5 minutes (for folder lists)
    'thumbnail': 86400 // 24 hours
  };

  getCacheKey(entity: string, id: string, userId?: string): string {
    const userPrefix = userId ? `:user:${userId}` : ':public';
    return `${this.CACHE_PREFIX}:${entity}${userPrefix}:${id}`;
  }

  getPatternKey(entity: string, userId?: string): string {
    const userPrefix = userId ? `:user:${userId}` : ':public';
    return `${this.CACHE_PREFIX}:${entity}${userPrefix}:*`;
  }

  shouldCache(entity: string): boolean {
    return Object.keys(this.ENTITY_TTL).includes(entity);
  }

  getTTL(entity: string): number {
    return this.ENTITY_TTL[entity] || this.DEFAULT_TTL;
  }
}

// Cache factory for creating cache services
export class CacheFactory {
  static createCacheService(config: ICacheConfig): ICacheService {
    const redisService = new RedisCacheService(config);
    
    // If Redis is not available, fall back to memory cache
    if (!redisService.isConnected()) {
      const logger = getLogger('CacheFactory');
      logger.warn('Redis not available, falling back to memory cache');
      return new MemoryCacheService();
    }
    
    return redisService;
  }
}
