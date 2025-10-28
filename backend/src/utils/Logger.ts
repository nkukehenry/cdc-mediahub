import { ILogger, LogLevel } from '../interfaces';

export class Logger implements ILogger {
  private logLevel: LogLevel;
  private context: string;

  constructor(logLevel: LogLevel = LogLevel.INFO, context: string = 'FileManager') {
    this.logLevel = logLevel;
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formattedMessage = `${timestamp} ${levelStr} ${contextStr} ${message}`;
    
    if (meta) {
      formattedMessage += ` | Meta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return formattedMessage;
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    const errorMeta = {
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    
    this.log(LogLevel.ERROR, message, errorMeta);
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setContext(context: string): void {
    this.context = context;
  }

  // Factory method for creating child loggers
  child(context: string): Logger {
    return new Logger(this.logLevel, `${this.context}:${context}`);
  }
}

// Singleton instance for global use
let globalLogger: Logger | null = null;

export function getLogger(context?: string): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  
  return context ? globalLogger.child(context) : globalLogger;
}

export function setGlobalLogLevel(level: LogLevel): void {
  if (!globalLogger) {
    globalLogger = new Logger(level);
  } else {
    globalLogger.setLogLevel(level);
  }
}
