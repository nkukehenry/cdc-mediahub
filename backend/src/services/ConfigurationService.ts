import { IFileManagerConfig, ICacheConfig } from '../interfaces';
import { LogLevel } from '../interfaces';

export class ConfigurationService {
  private config!: IFileManagerConfig;
  private cacheConfig!: ICacheConfig;
  private recaptchaSecret?: string;

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

    this.recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || undefined;

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

  getRecaptchaSecret(): string | undefined {
    return this.recaptchaSecret;
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
    // Support both DATABASE_URL (for connection string) and individual MySQL config
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      return {
        connectionString: databaseUrl,
        type: 'mysql' as const
      };
    }

    return {
      host: process.env.DB_HOST || process.env.MYSQL_HOST || process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.DATABASE_PORT || '3306'),
      user: process.env.DB_USER || process.env.MYSQL_USER || process.env.DATABASE_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.DATABASE_PASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.DATABASE_NAME || 'filemanager',
      type: 'mysql' as const
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
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
        max: parseInt(process.env.RATE_LIMIT_MAX || '1000') // 1000 requests per window default
      }
    };
  }

  // Email configuration
  getEmailConfig() {
    // Check for Microsoft Graph credentials with multiple naming conventions
    const graphClientId = process.env.EXCHANGE_EMAIL_CLIENT_ID || 
                          process.env.MICROSOFT_GRAPH_CLIENT_ID || 
                          process.env.MS_GRAPH_CLIENT_ID ||
                          process.env.GRAPH_CLIENT_ID ||
                          process.env.AZURE_CLIENT_ID;
    const graphClientSecret = process.env.EXCHANGE_EMAIL_CLIENT_SECRET || 
                              process.env.MICROSOFT_GRAPH_CLIENT_SECRET || 
                              process.env.MS_GRAPH_CLIENT_SECRET ||
                              process.env.GRAPH_CLIENT_SECRET ||
                              process.env.AZURE_CLIENT_SECRET;
    const graphTenantId = process.env.EXCHANGE_EMAIL_TENANT_ID || 
                          process.env.MICROSOFT_GRAPH_TENANT_ID || 
                          process.env.MS_GRAPH_TENANT_ID ||
                          process.env.GRAPH_TENANT_ID ||
                          process.env.AZURE_TENANT_ID;

    return {
      enabled: process.env.EMAIL_ENABLED === 'true',
      provider: (process.env.EMAIL_PROVIDER || 'smtp') as 'microsoft-graph' | 'smtp',
      // Microsoft Graph API config (support multiple naming conventions)
      graphClientId,
      graphClientSecret,
      graphTenantId,
      // SMTP config (for fallback or smtp provider)
      smtpHost: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
      smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.EMAIL_SECURE === 'true',
      smtpUser: process.env.SMTP_USER || process.env.EMAIL_USER,
      smtpPassword: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      // Email settings
      fromEmail: process.env.EMAIL_FROM || process.env.FROM_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
      fromName: process.env.EMAIL_FROM_NAME || process.env.FROM_NAME,
      replyTo: process.env.EMAIL_REPLY_TO || process.env.REPLY_TO,
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