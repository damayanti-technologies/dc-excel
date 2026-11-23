export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

class LoggerService {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private formatMessage(entry: LogEntry): string {
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`;
  }

  private log(level: LogLevel, module: string, message: string, data?: unknown): void {
    if (!this.isDevelopment && level === 'debug') {
      return;
    }

    const entry: LogEntry = {
      level,
      module,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case 'debug':
        if (data !== undefined) {
          console.debug(formatted, data);
        } else {
          console.debug(formatted);
        }
        break;
      case 'info':
        if (data !== undefined) {
          console.info(formatted, data);
        } else {
          console.info(formatted);
        }
        break;
      case 'warn':
        if (data !== undefined) {
          console.warn(formatted, data);
        } else {
          console.warn(formatted);
        }
        break;
      case 'error':
        if (data !== undefined) {
          console.error(formatted, data);
        } else {
          console.error(formatted);
        }
        break;
    }
  }

  public debug(module: string, message: string, data?: unknown): void {
    this.log('debug', module, message, data);
  }

  public info(module: string, message: string, data?: unknown): void {
    this.log('info', module, message, data);
  }

  public warn(module: string, message: string, data?: unknown): void {
    this.log('warn', module, message, data);
  }

  public error(module: string, message: string, data?: unknown): void {
    this.log('error', module, message, data);
  }
}

export const Logger = new LoggerService();
