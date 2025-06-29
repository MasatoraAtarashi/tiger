import fs from 'fs';
import path from 'path';
import os from 'os';

export class SimpleLogger {
  constructor() {
    this.logDir = path.join(os.homedir(), '.tiger', 'logs');
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFileName = `tiger-session-${this.sessionId}.log`;
    this.logFilePath = path.join(this.logDir, this.logFileName);
    
    // ログディレクトリを作成
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    this.writeLogHeader();
  }

  writeLogHeader() {
    const header = [
      '='.repeat(80),
      `Tiger CLI Session Log`,
      `Session ID: ${this.sessionId}`,
      `Started at: ${new Date().toISOString()}`,
      `Log Directory: ${this.logDir}`,
      '='.repeat(80),
      ''
    ].join('\n');

    fs.writeFileSync(this.logFilePath, header);
  }

  log(type, message, metadata = null) {
    const timestamp = new Date().toISOString();
    const typeEmoji = {
      info: 'ℹ️ ',
      tool: '🔧',
      exec: '⚡',
      error: '❌',
      success: '✅',
      user: '👤',
      assistant: '🐯'
    };

    const prefix = `[${timestamp}] ${typeEmoji[type] || '📝'} [${type.toUpperCase()}]`;
    let logLine = `${prefix} ${message}`;

    if (metadata) {
      logLine += '\n' + JSON.stringify(metadata, null, 2).split('\n').map(line => '    ' + line).join('\n');
    }

    fs.appendFileSync(this.logFilePath, logLine + '\n');
  }

  getLogFilePath() {
    return this.logFilePath;
  }

  close() {
    const footer = [
      '',
      '='.repeat(80),
      `Session ended at: ${new Date().toISOString()}`,
      '='.repeat(80)
    ].join('\n');

    fs.appendFileSync(this.logFilePath, footer);
  }
}