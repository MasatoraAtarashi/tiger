import { promises as fs } from 'fs';
import path from 'path';

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
      if (error instanceof Error) {
        throw new Error(`Failed to read file: ${error.message}`);
      }
      throw new Error('Failed to read file: Unknown error');
    }
  }
}
