import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, ensureLogDirectory } from './config';

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'tool' | 'exec' | 'error' | 'success' | 'user' | 'assistant';
  message: string;
  metadata?: any;
}

export class Logger {
  private logFilePath: string;
  private sessionId: string;
  private config = loadConfig();

  constructor() {
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    const logFileName = `tiger-session-${this.sessionId}.log`;
    this.logFilePath = path.join(this.config.logDir, logFileName);
    
    if (this.config.logEnabled) {
      ensureLogDirectory(this.config);
      this.writeLogHeader();
    }
  }

  private writeLogHeader(): void {
    const header = [
      '='.repeat(80),
      `Tiger CLI Session Log`,
      `Session ID: ${this.sessionId}`,
      `Started at: ${new Date().toISOString()}`,
      `Log Directory: ${this.config.logDir}`,
      '='.repeat(80),
      ''
    ].join('\n');

    fs.writeFileSync(this.logFilePath, header);
  }

  log(entry: LogEntry): void {
    if (!this.config.logEnabled) return;

    const formattedEntry = this.formatLogEntry(entry);
    fs.appendFileSync(this.logFilePath, formattedEntry + '\n');
  }

  private formatLogEntry(entry: LogEntry): string {
    const typeEmoji = {
      info: 'ℹ️ ',
      tool: '🔧',
      exec: '⚡',
      error: '❌',
      success: '✅',
      user: '👤',
      assistant: '🐯'
    };

    const prefix = `[${entry.timestamp}] ${typeEmoji[entry.type] || '📝'} [${entry.type.toUpperCase()}]`;
    let message = `${prefix} ${entry.message}`;

    if (entry.metadata) {
      message += '\n' + JSON.stringify(entry.metadata, null, 2).split('\n').map(line => '    ' + line).join('\n');
    }

    return message;
  }

  logUserInput(input: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'user',
      message: input
    });
  }

  logAssistantResponse(response: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'assistant',
      message: response
    });
  }

  logToolExecution(toolName: string, args: any, result?: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'tool',
      message: `Executing tool: ${toolName}`,
      metadata: { args, result }
    });
  }

  logError(error: any): void {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'error',
      message: error.message || String(error),
      metadata: error.stack ? { stack: error.stack } : undefined
    });
  }

  getLogFilePath(): string {
    return this.logFilePath;
  }

  close(): void {
    if (this.config.logEnabled) {
      const footer = [
        '',
        '='.repeat(80),
        `Session ended at: ${new Date().toISOString()}`,
        '='.repeat(80)
      ].join('\n');

      fs.appendFileSync(this.logFilePath, footer);
    }
  }
}