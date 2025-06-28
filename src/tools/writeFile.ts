import { promises as fs } from 'fs';
import path, { dirname } from 'path';

import { FileSystemError, ErrorCode } from '../errors/index.js';

import { Tool, ToolSchema } from './types.js';

interface WriteFileParams {
  filePath: string;
  content: string;
  createDirectories?: boolean;
}

interface WriteFileResult {
  path: string;
  bytesWritten: number;
  created: boolean;
}

export class WriteFileTool implements Tool<WriteFileParams, WriteFileResult> {
  schema: ToolSchema = {
    name: 'write_file',
    displayName: 'Write File',
    description: 'Write content to a file, creating it if it doesn\'t exist',
    parameters: [
      {
        name: 'filePath',
        type: 'string',
        description: 'The path to the file to write (absolute or relative)',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: 'The content to write to the file',
        required: true,
      },
      {
        name: 'createDirectories',
        type: 'boolean',
        description: 'Whether to create parent directories if they don\'t exist',
        required: false,
        default: true,
      },
    ],
  };

  validateParams(params: WriteFileParams): boolean {
    return (
      typeof params.filePath === 'string' &&
      params.filePath.length > 0 &&
      typeof params.content === 'string'
    );
  }

  shouldConfirmExecute(_params: WriteFileParams): boolean {
    // ファイル書き込みは確認が必要
    return true;
  }

  getConfirmationMessage(params: WriteFileParams): string {
    const preview = params.content.length > 100 
      ? params.content.substring(0, 100) + '...' 
      : params.content;
    return `ファイル "${params.filePath}" を作成/上書きします。\n\n内容のプレビュー:\n${preview}`;
  }

  async *execute(params: WriteFileParams): AsyncGenerator<WriteFileResult, void, unknown> {
    try {
      const absolutePath = path.resolve(params.filePath);
      
      // ファイルが既に存在するかチェック
      let fileExists = false;
      try {
        await fs.access(absolutePath);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      // 親ディレクトリの作成
      if (params.createDirectories !== false) {
        const dir = dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
      }

      // ファイルに書き込み
      await fs.writeFile(absolutePath, params.content, 'utf-8');
      
      // バイト数を取得
      // const stats = await fs.stat(absolutePath);

      yield {
        path: absolutePath,
        bytesWritten: Buffer.byteLength(params.content, 'utf-8'),
        created: !fileExists,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('EACCES')) {
        throw new FileSystemError(
          ErrorCode.FILE_ACCESS_DENIED,
          `Permission denied: ${params.filePath}`,
          params.filePath
        );
      } else if (error instanceof Error && error.message.includes('ENOSPC')) {
        throw new FileSystemError(
          ErrorCode.FILE_ACCESS_DENIED,
          `No space left on device: ${params.filePath}`,
          params.filePath
        );
      }
      throw new FileSystemError(
        ErrorCode.FILE_ACCESS_DENIED,
        `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        params.filePath,
        undefined,
        error as Error
      );
    }
  }
}