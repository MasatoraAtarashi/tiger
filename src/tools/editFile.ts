import { promises as fs } from 'fs';
import path from 'path';

import { FileSystemError, ErrorCode } from '../errors/index.js';

import { Tool, ToolSchema } from './types.js';

interface EditFileParams {
  filePath: string;
  search: string;
  replace: string;
  replaceAll?: boolean;
}

interface EditFileResult {
  path: string;
  changes: number;
  preview: string;
}

export class EditFileTool implements Tool<EditFileParams, EditFileResult> {
  schema: ToolSchema = {
    name: 'edit',
    displayName: 'Edit File',
    description: 'Replace text in a file',
    parameters: [
      {
        name: 'filePath',
        type: 'string',
        description: 'The path to the file to edit',
        required: true,
      },
      {
        name: 'search',
        type: 'string',
        description: 'The text to search for',
        required: true,
      },
      {
        name: 'replace',
        type: 'string',
        description: 'The text to replace with',
        required: true,
      },
      {
        name: 'replaceAll',
        type: 'boolean',
        description: 'Whether to replace all occurrences',
        required: false,
        default: false,
      },
    ],
  };

  validateParams(params: EditFileParams): boolean {
    return (
      typeof params.filePath === 'string' &&
      params.filePath.length > 0 &&
      typeof params.search === 'string' &&
      params.search.length > 0 &&
      typeof params.replace === 'string'
    );
  }

  shouldConfirmExecute(_params: EditFileParams): boolean {
    // ファイル編集は確認が必要
    return true;
  }

  getConfirmationMessage(params: EditFileParams): string {
    const preview = params.replace.length > 50 
      ? params.replace.substring(0, 50) + '...' 
      : params.replace;
    return `ファイル "${params.filePath}" を編集します。\n\n置換内容: "${params.search}" → "${preview}"`;
  }

  async *execute(params: EditFileParams): AsyncGenerator<EditFileResult, void, unknown> {
    try {
      const absolutePath = path.resolve(params.filePath);
      
      // ファイルの読み取り
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      // 置換の実行
      let newContent: string;
      let changes = 0;
      
      if (params.replaceAll) {
        // すべて置換
        const regex = new RegExp(this.escapeRegExp(params.search), 'g');
        newContent = content.replace(regex, () => {
          changes++;
          return params.replace;
        });
      } else {
        // 最初の1つだけ置換
        const index = content.indexOf(params.search);
        if (index !== -1) {
          newContent = content.substring(0, index) + 
                      params.replace + 
                      content.substring(index + params.search.length);
          changes = 1;
        } else {
          newContent = content;
          changes = 0;
        }
      }
      
      // 変更がある場合のみファイルに書き込み
      if (changes > 0) {
        await fs.writeFile(absolutePath, newContent, 'utf-8');
      }
      
      // プレビューの生成（変更箇所の前後を表示）
      const preview = this.generatePreview(content, newContent, params.search, params.replace);

      yield {
        path: absolutePath,
        changes,
        preview,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new FileSystemError(
          ErrorCode.FILE_NOT_FOUND,
          `File not found: ${params.filePath}`,
          params.filePath
        );
      } else if (error instanceof Error && error.message.includes('EACCES')) {
        throw new FileSystemError(
          ErrorCode.FILE_ACCESS_DENIED,
          `Permission denied: ${params.filePath}`,
          params.filePath
        );
      }
      throw new FileSystemError(
        ErrorCode.FILE_ACCESS_DENIED,
        `Failed to edit file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        params.filePath,
        undefined,
        error as Error
      );
    }
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private generatePreview(
    oldContent: string,
    newContent: string,
    _search: string,
    _replace: string
  ): string {
    const lines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const preview: string[] = [];
    
    // 変更があった行を探す
    for (let i = 0; i < Math.max(lines.length, newLines.length); i++) {
      if (lines[i] !== newLines[i]) {
        // コンテキストとして前後の行も含める
        const start = Math.max(0, i - 2);
        const end = Math.min(newLines.length, i + 3);
        
        for (let j = start; j < end; j++) {
          if (j === i && lines[j]) {
            preview.push(`- ${j + 1}: ${lines[j]}`);
            preview.push(`+ ${j + 1}: ${newLines[j]}`);
          } else if (newLines[j] !== undefined) {
            preview.push(`  ${j + 1}: ${newLines[j]}`);
          }
        }
        
        // 最初の変更箇所のみ表示
        break;
      }
    }
    
    if (preview.length === 0) {
      return 'No changes made';
    }
    
    return preview.join('\n');
  }
}