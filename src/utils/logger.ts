export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  data?: unknown;
}

export class Logger {
  private static instance: Logger;
  private debugMode: boolean = false;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {
    this.debugMode = process.env['TIGER_DEBUG'] === 'true';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  debug(category: string, message: string, data?: unknown): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: unknown): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: unknown): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, data?: unknown): void {
    this.log('error', category, message, data);
  }

  private log(level: LogEntry['level'], category: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.debugMode) {
      const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}] [${category}]`;
      const logMessage = `${prefix} ${message}`;

      if (data) {
        console.error(logMessage, JSON.stringify(data, null, 2));
      } else {
        console.error(logMessage);
      }
    }
  }

  getRecentLogs(count = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
  }
}
