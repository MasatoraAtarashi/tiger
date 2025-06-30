import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';

export interface HistoryEntry {
  timestamp: string;
  user: string;
  assistant: string;
  toolsUsed?: string[];
  filesModified?: string[];
}

export class HistoryManager {
  private historyPath: string;
  private maxHistorySize: number = 100;
  private currentSession: HistoryEntry[] = [];
  
  constructor() {
    this.historyPath = path.join(homedir(), '.tiger', 'history.json');
  }
  
  /**
   * 履歴を初期化・読み込み
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.historyPath), { recursive: true });
      const data = await fs.readFile(this.historyPath, 'utf-8');
      this.currentSession = JSON.parse(data);
    } catch {
      // ファイルが存在しない場合は空の配列で初期化
      this.currentSession = [];
    }
  }
  
  /**
   * 新しい履歴エントリを追加
   */
  async addEntry(entry: HistoryEntry): Promise<void> {
    this.currentSession.push(entry);
    
    // 最大サイズを超えたら古いエントリを削除
    if (this.currentSession.length > this.maxHistorySize) {
      this.currentSession = this.currentSession.slice(-this.maxHistorySize);
    }
    
    // ファイルに保存
    await this.save();
  }
  
  /**
   * 履歴を取得（最新n件）
   */
  getRecent(count: number = 10): HistoryEntry[] {
    return this.currentSession.slice(-count);
  }
  
  /**
   * 全履歴を取得
   */
  getAll(): HistoryEntry[] {
    return [...this.currentSession];
  }
  
  /**
   * 履歴をクリア
   */
  async clear(): Promise<void> {
    this.currentSession = [];
    await this.save();
  }
  
  /**
   * 履歴を検索
   */
  search(query: string): HistoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.currentSession.filter(entry => 
      entry.user.toLowerCase().includes(lowerQuery) ||
      entry.assistant.toLowerCase().includes(lowerQuery)
    );
  }
  
  /**
   * 履歴をフォーマットして表示用文字列に変換
   */
  formatHistory(entries: HistoryEntry[], detailed: boolean = false): string {
    if (entries.length === 0) {
      return '📜 No history found';
    }
    
    let output = '📜 Chat History\n' + '═'.repeat(50) + '\n\n';
    
    for (const entry of entries) {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleString();
      
      output += `🕐 ${timeStr}\n`;
      output += `👤 User: ${entry.user}\n`;
      output += `🤖 Tiger: ${entry.assistant.substring(0, 100)}${entry.assistant.length > 100 ? '...' : ''}\n`;
      
      if (detailed) {
        if (entry.toolsUsed && entry.toolsUsed.length > 0) {
          output += `🔧 Tools: ${entry.toolsUsed.join(', ')}\n`;
        }
        if (entry.filesModified && entry.filesModified.length > 0) {
          output += `📁 Files: ${entry.filesModified.join(', ')}\n`;
        }
      }
      
      output += '\n';
    }
    
    return output;
  }
  
  /**
   * 履歴をファイルに保存
   */
  private async save(): Promise<void> {
    await fs.writeFile(
      this.historyPath,
      JSON.stringify(this.currentSession, null, 2),
      'utf-8'
    );
  }
}