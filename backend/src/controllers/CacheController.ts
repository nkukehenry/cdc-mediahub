import { Request, Response } from 'express';
import { getLogger } from '../utils/Logger';
import { getErrorHandler } from '../utils/ErrorHandler';
import { ICacheService } from '../interfaces/Cache';

export class CacheController {
  private logger = getLogger('CacheController');
  private errorHandler = getErrorHandler();

  constructor(private cacheService: ICacheService) {}

  /**
   * Get cache statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = this.cacheService.isConnected();
      const supportsMemoryIntrospection = typeof (this.cacheService as any).getKeys === 'function';
      const hasRedisAccessor = typeof (this.cacheService as any).getRedisInstance === 'function';
      const redisInstance = hasRedisAccessor ? (this.cacheService as any).getRedisInstance() : null;
      const isRedisService = !supportsMemoryIntrospection;

      const stats: any = {
        connected: isRedisService ? isConnected : true,
        type: isRedisService ? 'redis' : 'memory',
        totalKeys: 0,
        memoryUsage: null,
        uptime: null
      };

      if (isRedisService && isConnected && redisInstance) {
        try {
          const info = await redisInstance.info('stats');
          const keyspace = await redisInstance.info('keyspace');
          const memory = await redisInstance.info('memory');

          const parseInfo = (infoStr: string) => {
            const result: Record<string, string> = {};
            infoStr.split('\r\n').forEach(line => {
              const [key, value] = line.split(':');
              if (key && value) {
                result[key] = value;
              }
            });
            return result;
          };

          const statsInfo = parseInfo(info);
          const keyspaceInfo = parseInfo(keyspace);
          const memoryInfo = parseInfo(memory);

          let totalKeys = 0;
          Object.keys(keyspaceInfo).forEach(db => {
            const match = keyspaceInfo[db].match(/keys=(\d+)/);
            if (match) {
              totalKeys += parseInt(match[1], 10);
            }
          });

          stats.totalKeys = totalKeys;
          stats.memoryUsage = memoryInfo.used_memory_human || null;
          stats.uptime = statsInfo.uptime_in_seconds ? parseInt(statsInfo.uptime_in_seconds, 10) : null;
        } catch (error) {
          this.logger.warn('Could not fetch detailed Redis stats', error as Error);
        }
      } else if (!isRedisService && supportsMemoryIntrospection) {
        try {
          const keys = (this.cacheService as any).getKeys?.();
          if (Array.isArray(keys)) {
            stats.totalKeys = keys.length;
          }
        } catch (error) {
          this.logger.warn('Could not fetch memory cache stats', error as Error);
        }
      }

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      this.logger.error('Get cache stats failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Get cache keys by pattern
   */
  async getKeys(req: Request, res: Response): Promise<void> {
    try {
      const { pattern = '*', limit = 100 } = req.query;
      
      if (!this.cacheService.isConnected()) {
        res.json({
          success: true,
          data: { keys: [], total: 0, shown: 0 }
        });
        return;
      }

      // If using Redis, get keys
      if ('getRedisInstance' in this.cacheService) {
        try {
          const redis = (this.cacheService as any).getRedisInstance();
          if (redis) {
            const keys = await redis.keys(pattern as string);
            const limitedKeys = keys.slice(0, parseInt(limit as string, 10));
            
            // Get TTL for each key
            const keysWithInfo = await Promise.all(
              limitedKeys.map(async (key: string) => {
                const ttl = await redis.ttl(key);
                const type = await redis.type(key);
                return {
                  key,
                  ttl: ttl > 0 ? ttl : null,
                  type
                };
              })
            );

            res.json({
              success: true,
              data: {
                keys: keysWithInfo,
                total: keys.length,
                shown: limitedKeys.length
              }
            });
            return;
          }
        } catch (error) {
          this.logger.error('Error getting cache keys', error as Error);
        }
      }

      // Fallback for memory cache
      if ('getKeys' in this.cacheService && 'getKeyInfo' in this.cacheService) {
        try {
          const allKeys = (this.cacheService as any).getKeys();
          const patternRegex = new RegExp((pattern as string).replace(/\*/g, '.*'));
          const matchingKeys = allKeys.filter((key: string) => patternRegex.test(key));
          const limitedKeys = matchingKeys.slice(0, parseInt(limit as string, 10));
          
          const keysWithInfo = limitedKeys.map((key: string) => {
            const info = (this.cacheService as any).getKeyInfo(key);
            return {
              key,
              ttl: info?.ttl ?? null,
              type: 'string'
            };
          });

          res.json({
            success: true,
            data: {
              keys: keysWithInfo,
              total: matchingKeys.length,
              shown: limitedKeys.length
            }
          });
          return;
        } catch (error) {
          this.logger.error('Error getting memory cache keys', error as Error);
        }
      }

      // Fallback if all else fails
      res.json({
        success: true,
        data: { keys: [], total: 0, shown: 0 }
      });
    } catch (error) {
      this.logger.error('Get cache keys failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Get cache value by key
   */
  async getValue(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      
      if (!key) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Key is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const value = await this.cacheService.get(key);
      
      res.json({
        success: true,
        data: {
          key,
          value: value !== null ? value : null,
          exists: value !== null
        }
      });
    } catch (error) {
      this.logger.error('Get cache value failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Delete cache by key
   */
  async deleteKey(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      
      if (!key) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Key is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const deleted = await this.cacheService.del(key);
      
      res.json({
        success: true,
        data: {
          key,
          deleted
        }
      });
    } catch (error) {
      this.logger.error('Delete cache key failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Delete cache by pattern
   */
  async deletePattern(req: Request, res: Response): Promise<void> {
    try {
      const { pattern } = req.body;
      
      if (!pattern) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Pattern is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const deleted = await this.cacheService.delPattern(pattern);
      
      res.json({
        success: true,
        data: {
          pattern,
          deleted
        }
      });
    } catch (error) {
      this.logger.error('Delete cache pattern failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }

  /**
   * Flush all cache
   */
  async flushAll(req: Request, res: Response): Promise<void> {
    try {
      const flushed = await this.cacheService.flush();
      
      res.json({
        success: true,
        data: {
          flushed
        }
      });
    } catch (error) {
      this.logger.error('Flush cache failed', error as Error);
      res.status(500).json(this.errorHandler.formatErrorResponse(error as Error));
    }
  }
}

