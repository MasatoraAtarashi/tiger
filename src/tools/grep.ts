import { promises as fs } from 'fs';
import path from 'path';

import { Tool, ToolSchema } from './types.js';
import { ToolError, ErrorCode } from '../errors/index.js';

interface GrepParams {
  pattern: string;
  path?: string;
  directory?: string; // alias for path for backward compatibility
  recursive?: boolean;
  ignoreCase?: boolean;
  showLineNumbers?: boolean;
  maxResults?: number;
}

interface GrepMatch {
  file: string;
  line: number;
  content: string;
  match: string;
}

interface GrepResult {
  matches: GrepMatch[];
  totalMatches: number;
  filesSearched: number;
}

export class GrepTool implements Tool<GrepParams, GrepResult> {
  validateParams(params: GrepParams): boolean {
    return typeof params.pattern === 'string' && params.pattern.length > 0;
  }

  shouldConfirmExecute(_params: GrepParams): boolean {
    // Grep is a read-only operation, no confirmation needed
    return false;
  }
  schema: ToolSchema = {
    name: 'grep',
    displayName: 'Grep',
    description: 'Search for patterns in files',
    parameters: [
      {
        name: 'pattern',
        type: 'string',
        description: 'Regular expression pattern to search for',
        required: true,
      },
      {
        name: 'path',
        type: 'string',
        description: 'File or directory path to search in (default: current directory)',
        required: false,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description: 'Search recursively in subdirectories (default: true)',
        required: false,
        default: true,
      },
      {
        name: 'ignoreCase',
        type: 'boolean',
        description: 'Case-insensitive search (default: false)',
        required: false,
        default: false,
      },
      {
        name: 'showLineNumbers',
        type: 'boolean',
        description: 'Show line numbers in results (default: true)',
        required: false,
        default: true,
      },
      {
        name: 'maxResults',
        type: 'number',
        description: 'Maximum number of results to return (default: 100)',
        required: false,
        default: 100,
      },
    ],
  };

  async *execute(params: GrepParams): AsyncGenerator<GrepResult> {
    const searchPath = params.path || process.cwd();
    const recursive = params.recursive ?? true;
    const ignoreCase = params.ignoreCase ?? false;
    const showLineNumbers = params.showLineNumbers ?? true;
    const maxResults = params.maxResults ?? 100;

    const regex = new RegExp(params.pattern, ignoreCase ? 'gi' : 'g');
    const matches: GrepMatch[] = [];
    let filesSearched = 0;

    try {
      const stats = await fs.stat(searchPath);
      
      if (stats.isFile()) {
        // Search in a single file
        await this.searchFile(searchPath, regex, matches, maxResults, showLineNumbers);
        filesSearched = 1;
      } else if (stats.isDirectory()) {
        // Search in directory
        await this.searchDirectory(searchPath, regex, matches, maxResults, showLineNumbers, recursive);
        filesSearched = matches.reduce((acc, match) => {
          return acc + (matches.filter(m => m.file === match.file).length === 1 ? 1 : 0);
        }, 0);
      }

      yield {
        matches: matches.slice(0, maxResults),
        totalMatches: matches.length,
        filesSearched,
      };
    } catch (error) {
      throw new ToolError(
        ErrorCode.TOOL_EXECUTION_FAILED,
        `Grep error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'grep',
        { pattern: params.pattern, path: params.path },
        error as Error
      );
    }
  }

  private async searchFile(
    filePath: string,
    regex: RegExp,
    matches: GrepMatch[],
    maxResults: number,
    showLineNumbers: boolean
  ): Promise<void> {
    if (matches.length >= maxResults) return;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
        const line = lines[i]!;
        const lineMatches = line.matchAll(new RegExp(regex.source, regex.flags));
        
        for (const match of lineMatches) {
          if (matches.length >= maxResults) break;
          
          matches.push({
            file: filePath,
            line: showLineNumbers ? i + 1 : 0,
            content: line.trim(),
            match: match[0],
          });
        }
      }
    } catch (error) {
      // Skip files that cannot be read (binary files, permission issues, etc.)
      if (error instanceof Error && error.message.includes('EACCES')) {
        // Permission denied - skip silently
      }
    }
  }

  private async searchDirectory(
    dirPath: string,
    regex: RegExp,
    matches: GrepMatch[],
    maxResults: number,
    showLineNumbers: boolean,
    recursive: boolean
  ): Promise<void> {
    if (matches.length >= maxResults) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (matches.length >= maxResults) break;

        const fullPath = path.join(dirPath, entry.name);

        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === 'coverage' ||
            entry.name === '.git') {
          continue;
        }

        if (entry.isFile()) {
          // Only search text files
          const ext = path.extname(entry.name).toLowerCase();
          const textExtensions = [
            '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt',
            '.yml', '.yaml', '.xml', '.html', '.css', '.scss',
            '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp',
            '.h', '.hpp', '.sh', '.bash', '.zsh', '.fish',
            '.env', '.config', '.conf', '.ini', '.toml',
          ];

          if (textExtensions.includes(ext) || !ext) {
            await this.searchFile(fullPath, regex, matches, maxResults, showLineNumbers);
          }
        } else if (entry.isDirectory() && recursive) {
          await this.searchDirectory(fullPath, regex, matches, maxResults, showLineNumbers, recursive);
        }
      }
    } catch (error) {
      // Skip directories that cannot be read
      if (error instanceof Error && error.message.includes('EACCES')) {
        // Permission denied - skip silently
      }
    }
  }
}