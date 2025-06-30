import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProcessedMessage {
  content: string;
  attachedFiles: Array<{
    path: string;
    content: string;
  }>;
}

export class MessageProcessor {
  /**
   * @でファイルを指定したメッセージを処理
   * 例: "このコードを見て @src/index.ts @package.json"
   */
  async processMessage(message: string, workingDir: string): Promise<ProcessedMessage> {
    const filePattern = /@([^\s]+)/g;
    const matches = Array.from(message.matchAll(filePattern));
    const attachedFiles: ProcessedMessage['attachedFiles'] = [];
    
    // @ファイル指定を処理
    for (const match of matches) {
      const filePath = match[1];
      const fullPath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(workingDir, filePath);
      
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        attachedFiles.push({
          path: filePath,
          content
        });
      } catch (error) {
        // ファイルが読めない場合はスキップ
        console.warn(`Could not read file: ${filePath}`);
      }
    }
    
    // @ファイル指定を削除したメッセージ
    const cleanMessage = message.replace(filePattern, '').trim();
    
    // ファイル内容を含むメッセージを構築
    let processedContent = cleanMessage;
    if (attachedFiles.length > 0) {
      processedContent += '\n\n--- Attached Files ---\n';
      for (const file of attachedFiles) {
        processedContent += `\n📎 ${file.path}:\n\`\`\`\n${file.content}\n\`\`\`\n`;
      }
    }
    
    return {
      content: processedContent,
      attachedFiles
    };
  }
  
  /**
   * ファイル名の補完候補を取得
   */
  async getFileCompletions(partialPath: string, workingDir: string): Promise<string[]> {
    try {
      const dir = path.dirname(partialPath) || '.';
      const prefix = path.basename(partialPath);
      const searchDir = path.isAbsolute(dir) ? dir : path.join(workingDir, dir);
      
      const files = await fs.readdir(searchDir);
      return files
        .filter(file => file.startsWith(prefix))
        .map(file => path.join(dir, file));
    } catch {
      return [];
    }
  }
}