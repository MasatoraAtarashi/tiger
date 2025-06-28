import { promises as fs } from 'fs';
import path from 'path';

import { FileSystemError, ErrorCode } from '../errors/index.js';

import { Tool, ToolSchema } from './types.js';

interface ReadFileParams {
  filePath: string;
}

interface ReadFileResult {
  content: string;
  path: string;
}

export class ReadFileTool implements Tool<ReadFileParams, ReadFileResult> {
  schema: ToolSchema = {
    name: 'read_file',
    displayName: 'Read File',
    description: 'Read the contents of a file from the local filesystem',
    parameters: [
      {
        name: 'filePath',
        type: 'string',
        description: 'The path to the file to read (absolute or relative)',
        required: true,
      },
    ],
  };

  validateParams(params: ReadFileParams): boolean {
    return typeof params.filePath === 'string' && params.filePath.length > 0;
  }

  shouldConfirmExecute(_params: ReadFileParams): boolean {
    // ファイル読み取りは確認不要
    return false;
  }

  async *execute(params: ReadFileParams): AsyncGenerator<ReadFileResult, void, unknown> {
    try {
      const absolutePath = path.resolve(params.filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');

      yield {
        content,
        path: absolutePath,
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
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        params.filePath,
        undefined,
        error as Error
      );
    }
  }
}
