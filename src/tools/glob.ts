import { promises as fs } from 'fs';
import path from 'path';

import { Tool, ToolSchema } from './types.js';
import { ToolError, ErrorCode } from '../errors/index.js';

interface GlobParams {
  pattern: string;
  basePath?: string;
  recursive?: boolean;
  includeDirectories?: boolean;
  maxResults?: number;
}

interface GlobMatch {
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: Date;
}

interface GlobResult {
  matches: GlobMatch[];
  totalMatches: number;
}

export class GlobTool implements Tool<GlobParams, GlobResult> {
  validateParams(params: GlobParams): boolean {
    return typeof params.pattern === 'string' && params.pattern.length > 0;
  }

  shouldConfirmExecute(_params: GlobParams): boolean {
    // Glob is a read-only operation, no confirmation needed
    return false;
  }
  schema: ToolSchema = {
    name: 'glob',
    displayName: 'Glob',
    description: 'Find files and directories matching a pattern',
    parameters: [
      {
        name: 'pattern',
        type: 'string',
        description: 'Glob pattern to match (e.g., "*.js", "**/*.ts", "src/**/test*.js")',
        required: true,
      },
      {
        name: 'basePath',
        type: 'string',
        description: 'Base directory to search from (default: current directory)',
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
        name: 'includeDirectories',
        type: 'boolean',
        description: 'Include directories in results (default: false)',
        required: false,
        default: false,
      },
      {
        name: 'maxResults',
        type: 'number',
        description: 'Maximum number of results to return (default: 1000)',
        required: false,
        default: 1000,
      },
    ],
  };

  async *execute(params: GlobParams): AsyncGenerator<GlobResult> {
    const basePath = params.basePath || process.cwd();
    const recursive = params.recursive ?? true;
    const includeDirectories = params.includeDirectories ?? false;
    const maxResults = params.maxResults ?? 1000;

    const matches: GlobMatch[] = [];

    try {
      await this.findMatches(
        basePath,
        params.pattern,
        matches,
        maxResults,
        recursive,
        includeDirectories,
        basePath
      );

      // Sort by path
      matches.sort((a, b) => a.path.localeCompare(b.path));

      yield {
        matches: matches.slice(0, maxResults),
        totalMatches: matches.length,
      };
    } catch (error) {
      throw new ToolError(
        ErrorCode.TOOL_EXECUTION_FAILED,
        `Glob error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'glob',
        { pattern: params.pattern, basePath },
        error as Error
      );
    }
  }

  private async findMatches(
    currentPath: string,
    pattern: string,
    matches: GlobMatch[],
    maxResults: number,
    recursive: boolean,
    includeDirectories: boolean,
    basePath: string
  ): Promise<void> {
    if (matches.length >= maxResults) return;

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (matches.length >= maxResults) break;

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === 'coverage' ||
            entry.name === '.git') {
          continue;
        }

        const stats = await fs.stat(fullPath);

        // Check if path matches pattern
        if (this.matchesPattern(relativePath, pattern)) {
          if (entry.isFile() || (entry.isDirectory() && includeDirectories)) {
            matches.push({
              path: fullPath,
              type: entry.isFile() ? 'file' : 'directory',
              size: stats.size,
              modifiedAt: stats.mtime,
            });
          }
        }

        // Recurse into directories
        if (entry.isDirectory() && recursive) {
          await this.findMatches(
            fullPath,
            pattern,
            matches,
            maxResults,
            recursive,
            includeDirectories,
            basePath
          );
        }
      }
    } catch (error) {
      // Skip directories that cannot be read
      if (error instanceof Error && error.message.includes('EACCES')) {
        // Permission denied - skip silently
      }
    }
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    let regexPattern = pattern
      // Escape special regex characters except * and ?
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      // Convert ** to match any number of directories
      .replace(/\*\*/g, '.*')
      // Convert * to match any characters except path separator
      .replace(/\*/g, '[^/\\\\]*')
      // Convert ? to match single character
      .replace(/\?/g, '.');

    // Add anchors
    regexPattern = '^' + regexPattern + '$';

    const regex = new RegExp(regexPattern);
    
    // Normalize path separators for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    return regex.test(normalizedPath);
  }
}