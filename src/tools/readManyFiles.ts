import { promises as fs } from 'fs';
import path from 'path';

import { Tool, ToolSchema } from './types.js';

interface ReadManyFilesParams {
  filePaths: string[];
  includeContent?: boolean;
  maxFileSize?: number;
}

interface FileContent {
  path: string;
  content?: string;
  error?: string;
  size: number;
  exists: boolean;
}

interface ReadManyFilesResult {
  files: FileContent[];
  totalFiles: number;
  successCount: number;
  errorCount: number;
}

export class ReadManyFilesTool implements Tool<ReadManyFilesParams, ReadManyFilesResult> {
  validateParams(params: ReadManyFilesParams): boolean {
    return Array.isArray(params.filePaths) && params.filePaths.length > 0;
  }

  shouldConfirmExecute(_params: ReadManyFilesParams): boolean {
    // Reading files is a safe operation, no confirmation needed
    return false;
  }
  schema: ToolSchema = {
    name: 'read_many_files',
    displayName: 'Read Many Files',
    description: 'Read the contents of multiple files at once',
    parameters: [
      {
        name: 'filePaths',
        type: 'array',
        description: 'Array of file paths to read',
        required: true,
      },
      {
        name: 'includeContent',
        type: 'boolean',
        description: 'Whether to include file content (default: true)',
        required: false,
        default: true,
      },
      {
        name: 'maxFileSize',
        type: 'number',
        description: 'Maximum file size in bytes to read (default: 1MB)',
        required: false,
        default: 1048576,
      },
    ],
  };

  async *execute(params: ReadManyFilesParams): AsyncGenerator<ReadManyFilesResult> {
    const includeContent = params.includeContent ?? true;
    const maxFileSize = params.maxFileSize ?? 1024 * 1024; // 1MB default

    const files: FileContent[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const filePath of params.filePaths) {
      try {
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        
        try {
          const stats = await fs.stat(absolutePath);
          
          if (!stats.isFile()) {
            files.push({
              path: filePath,
              error: 'Not a file',
              size: 0,
              exists: false,
            });
            errorCount++;
            continue;
          }

          if (includeContent) {
            if (stats.size > maxFileSize) {
              files.push({
                path: filePath,
                error: `File too large (${stats.size} bytes > ${maxFileSize} bytes)`,
                size: stats.size,
                exists: true,
              });
              errorCount++;
            } else {
              const content = await fs.readFile(absolutePath, 'utf-8');
              files.push({
                path: filePath,
                content,
                size: stats.size,
                exists: true,
              });
              successCount++;
            }
          } else {
            files.push({
              path: filePath,
              size: stats.size,
              exists: true,
            });
            successCount++;
          }
        } catch (error) {
          files.push({
            path: filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
            size: 0,
            exists: false,
          });
          errorCount++;
        }
      } catch (error) {
        files.push({
          path: filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
          size: 0,
          exists: false,
        });
        errorCount++;
      }
    }

    yield {
      files,
      totalFiles: params.filePaths.length,
      successCount,
      errorCount,
    };
  }
}