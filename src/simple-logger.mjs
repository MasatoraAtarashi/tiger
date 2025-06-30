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
      'Tiger CLI Session Log',
      `Session ID: ${this.sessionId}`,
      `Started at: ${new Date().toISOString()}`,
      `Log Directory: ${this.logDir}`,
      '='.repeat(80),
      ''
    ].join('\n');

    fs.writeFileSync(this.logFilePath, header);
  }

  log(typeOrEntry, message, metadata = null) {
    // オブジェクトとして渡された場合の処理
    if (typeof typeOrEntry === 'object' && typeOrEntry !== null) {
      const { type, message: msg, metadata: meta, timestamp } = typeOrEntry;
      this.writeLog(timestamp || new Date().toISOString(), type, msg, meta);
      return;
    }

    // 従来の引数形式の処理
    this.writeLog(new Date().toISOString(), typeOrEntry, message, metadata);
  }

  writeLog(timestamp, type, message, metadata = null) {
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

  logUserInput(input) {
    this.log('user', input);
  }

  logAssistantResponse(response) {
    this.log('assistant', response);
  }

  logToolExecution(toolName, args, result) {
    this.log('tool', `Executing tool: ${toolName}`, { args, result });
  }

  logError(error) {
    this.log('error', error.message || String(error), error.stack ? { stack: error.stack } : undefined);
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