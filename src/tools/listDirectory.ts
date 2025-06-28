import { promises as fs } from 'fs';
import path from 'path';

import { FileSystemError, ErrorCode } from '../errors/index.js';

import { Tool, ToolSchema } from './types.js';

interface ListDirectoryParams {
  directoryPath: string;
  path?: string; // alias for directoryPath for backward compatibility
  showHidden?: boolean;
  recursive?: boolean;
  maxDepth?: number;
}

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modified: Date;
}

interface ListDirectoryResult {
  path: string;
  files: FileInfo[];
  totalCount: number;
}

export class ListDirectoryTool implements Tool<ListDirectoryParams, ListDirectoryResult> {
  schema: ToolSchema = {
    name: 'ls',
    displayName: 'List Directory',
    description: 'List files and directories in a given path',
    parameters: [
      {
        name: 'directoryPath',
        type: 'string',
        description: 'The path to the directory to list (absolute or relative)',
        required: true,
      },
      {
        name: 'showHidden',
        type: 'boolean',
        description: 'Whether to show hidden files (starting with .)',
        required: false,
        default: false,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'Whether to list files recursively',
        required: false,
        default: false,
      },
      {
        name: 'maxDepth',
        type: 'number',
        description: 'Maximum depth for recursive listing',
        required: false,
        default: 3,
      },
    ],
  };

  validateParams(params: ListDirectoryParams): boolean {
    return typeof params.directoryPath === 'string' && params.directoryPath.length > 0;
  }

  shouldConfirmExecute(_params: ListDirectoryParams): boolean {
    // ディレクトリ一覧の取得は確認不要
    return false;
  }

  async *execute(params: ListDirectoryParams): AsyncGenerator<ListDirectoryResult, void, unknown> {
    const directoryPath = params.directoryPath || params.path || '.';
    try {
      const absolutePath = path.resolve(directoryPath);
      
      // ディレクトリの存在確認
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new FileSystemError(
          ErrorCode.DIRECTORY_NOT_FOUND,
          `Path is not a directory: ${absolutePath}`,
          absolutePath
        );
      }

      const files: FileInfo[] = [];
      
      if (params.recursive) {
        await this.listRecursive(absolutePath, files, params.showHidden || false, 0, params.maxDepth || 3);
      } else {
        await this.listFlat(absolutePath, files, params.showHidden || false);
      }

      // パスでソート
      files.sort((a, b) => a.path.localeCompare(b.path));

      yield {
        path: absolutePath,
        files,
        totalCount: files.length,
      };
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      } else if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new FileSystemError(
          ErrorCode.DIRECTORY_NOT_FOUND,
          `Directory not found: ${directoryPath}`,
          directoryPath
        );
      } else if (error instanceof Error && error.message.includes('EACCES')) {
        throw new FileSystemError(
          ErrorCode.FILE_ACCESS_DENIED,
          `Permission denied: ${directoryPath}`,
          directoryPath
        );
      }
      throw new FileSystemError(
        ErrorCode.FILE_ACCESS_DENIED,
        `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        directoryPath,
        undefined,
        error as Error
      );
    }
  }

  private async listFlat(dirPath: string, files: FileInfo[], showHidden: boolean): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // 隠しファイルのフィルタリング
      if (!showHidden && entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(fullPath);
      
      files.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
        size: stats.size,
        modified: stats.mtime,
      });
    }
  }

  private async listRecursive(
    dirPath: string,
    files: FileInfo[],
    showHidden: boolean,
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      return;
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // 隠しファイルのフィルタリング
      if (!showHidden && entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const stats = await fs.stat(fullPath);
      
      files.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
        size: stats.size,
        modified: stats.mtime,
      });

      // ディレクトリの場合は再帰的に探索
      if (entry.isDirectory()) {
        await this.listRecursive(fullPath, files, showHidden, currentDepth + 1, maxDepth);
      }
    }
  }
}