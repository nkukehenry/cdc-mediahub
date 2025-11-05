import { IFileManagerConfig, ICacheConfig } from '../interfaces';
import { LogLevel } from '../interfaces';

export class ConfigurationService {
  private config!: IFileManagerConfig;
  private cacheConfig!: ICacheConfig;

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    // Load from environment variables with defaults
    const maxFileSizeMb = process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB) : undefined;
    const maxFileSize = typeof maxFileSizeMb === 'number' && !isNaN(maxFileSizeMb)
      ? maxFileSizeMb * 1024 * 1024
      : parseInt(process.env.MAX_FILE_SIZE || '104857600'); // fallback to bytes env or default 100MB

    this.config = {
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      thumbnailPath: process.env.THUMBNAIL_PATH || './thumbnails',
      maxFileSize: maxFileSize,
      allowedMimeTypes: (() => {
        const fromEnv = (process.env.ALLOWED_FILE_TYPES || '').split(',').map(s => s.trim()).filter(Boolean);
        if (fromEnv.length > 0) return fromEnv;
        // Sensible defaults covering images, videos, audios, documents and text
        return [
          'image/*',
          'video/*',
          'audio/*',
          'application/pdf',
          'text/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/rtf',
          'application/vnd.oasis.opendocument.text',
          'application/vnd.oasis.opendocument.spreadsheet',
          'application/vnd.oasis.opendocument.presentation'
        ];
      })(),
      enableThumbnails: process.env.ENABLE_THUMBNAILS !== 'false',
      logLevel: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO
    };

    this.cacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
      lazyConnect: process.env.REDIS_LAZY_CONNECT !== 'false',
      enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
      enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE === 'true'
    };

    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    if (this.config.maxFileSize <= 0) {
      errors.push('MAX_FILE_SIZE or MAX_FILE_SIZE_MB must be a positive number');
    }

    if (this.config.allowedMimeTypes.length === 0) {
      errors.push('ALLOWED_FILE_TYPES must contain at least one MIME type');
    }

    if (this.cacheConfig.port <= 0 || this.cacheConfig.port > 65535) {
      errors.push('REDIS_PORT must be a valid port number (1-65535)');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  getConfig(): IFileManagerConfig {
    return { ...this.config };
  }

  getCacheConfig(): ICacheConfig {
    return { ...this.cacheConfig };
  }

  updateConfig(updates: Partial<IFileManagerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
  }

  updateCacheConfig(updates: Partial<ICacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...updates };
  }

  // Environment-specific configurations
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  // Database configuration
  getDatabaseConfig() {
    return {
      filename: process.env.DATABASE_PATH || './database.sqlite',
      verbose: this.isDevelopment()
    };
  }

  // Server configuration
  getServerConfig() {
    return {
      port: parseInt(process.env.PORT || '3001'),
      host: process.env.HOST || '0.0.0.0',
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true'
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
        max: parseInt(process.env.RATE_LIMIT_MAX || '1000') // 1000 requests per window default
      }
    };
  }
}

// Singleton instance
let configService: ConfigurationService | null = null;

export function getConfigurationService(): ConfigurationService {
  if (!configService) {
    configService = new ConfigurationService();
  }
  return configService;
}