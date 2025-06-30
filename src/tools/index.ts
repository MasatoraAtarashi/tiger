import { z } from 'zod';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import glob from 'fast-glob';

// ツールの型定義
interface Tool {
  id: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  outputSchema: z.ZodObject<any>;
  execute: (input: any) => Promise<any>;
}

// ファイルシステムツール
export const LSTool: Tool = {
  id: 'ls',
  description: 'List directory contents',
  inputSchema: z.object({
    path: z.string().describe('Path to list').default('.')
  }),
  outputSchema: z.object({
    files: z.array(z.string())
  }),
  execute: async ({ path }) => {
    const files = await fs.readdir(path);
    return { files };
  }
};

export const ReadFileTool: Tool = {
  id: 'read_file',
  description: 'Read a single file',
  inputSchema: z.object({
    path: z.string().describe('Path to file')
  }),
  outputSchema: z.object({
    content: z.string()
  }),
  execute: async ({ path }) => {
    const content = await fs.readFile(path, 'utf-8');
    return { content };
  }
};

export const WriteFileTool: Tool = {
  id: 'write_file',
  description: 'Write content to a file',
  inputSchema: z.object({
    path: z.string().describe('Path to file'),
    content: z.string().describe('Content to write')
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  execute: async ({ path: filePath, content }) => {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  }
};

export const GrepTool: Tool = {
  id: 'grep',
  description: 'Search for pattern in files',
  inputSchema: z.object({
    pattern: z.string().describe('Pattern to search'),
    path: z.string().describe('Path to search in').default('.')
  }),
  outputSchema: z.object({
    matches: z.array(z.object({
      file: z.string(),
      line: z.number(),
      content: z.string()
    }))
  }),
  execute: async ({ pattern, path }) => {
    try {
      const result = execSync(`grep -rn "${pattern}" ${path}`, { encoding: 'utf-8' });
      const matches = result.split('\n').filter(Boolean).map(line => {
        const [fileLine, ...contentParts] = line.split(':');
        const [file, lineNum] = fileLine.split(':');
        return {
          file,
          line: parseInt(lineNum),
          content: contentParts.join(':').trim()
        };
      });
      return { matches };
    } catch (error) {
      return { matches: [] };
    }
  }
};

export const GlobTool: Tool = {
  id: 'glob',
  description: 'Find files with glob pattern',
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern')
  }),
  outputSchema: z.object({
    files: z.array(z.string())
  }),
  execute: async ({ pattern }) => {
    const files = await glob(pattern);
    return { files };
  }
};

// 実行ツール
export const ShellTool: Tool = {
  id: 'shell',
  description: 'Execute shell command',
  inputSchema: z.object({
    command: z.string().describe('Command to execute')
  }),
  outputSchema: z.object({
    stdout: z.string(),
    stderr: z.string(),
    exitCode: z.number()
  }),
  execute: async ({ command }) => {
    try {
      const stdout = execSync(command, { encoding: 'utf-8' });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.status || 1
      };
    }
  }
};

// Webツール（簡易実装）
export const WebFetchTool: Tool = {
  id: 'web_fetch',
  description: 'Fetch content from URL',
  inputSchema: z.object({
    url: z.string().url().describe('URL to fetch')
  }),
  outputSchema: z.object({
    content: z.string(),
    statusCode: z.number()
  }),
  execute: async ({ url }) => {
    const response = await fetch(url);
    const content = await response.text();
    return { content, statusCode: response.status };
  }
};

// メモリツール（簡易実装）
const memoryStore = new Map<string, any>();

export const MemoryTool: Tool = {
  id: 'memory',
  description: 'Store and retrieve from memory',
  inputSchema: z.object({
    action: z.enum(['get', 'set', 'delete']),
    key: z.string(),
    value: z.any().optional()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    value: z.any().optional()
  }),
  execute: async ({ action, key, value }) => {
    switch (action) {
      case 'get':
        return { success: true, value: memoryStore.get(key) };
      case 'set':
        memoryStore.set(key, value);
        return { success: true };
      case 'delete':
        memoryStore.delete(key);
        return { success: true };
      default:
        return { success: false };
    }
  }
};

// ツールレジストリ作成関数
export function createToolRegistry(config?: {
  coreTools?: string[];
  excludeTools?: string[];
}): Record<string, Tool> {
  const allTools: Record<string, Tool> = {
    ls: LSTool,
    read_file: ReadFileTool,
    write_file: WriteFileTool,
    grep: GrepTool,
    glob: GlobTool,
    shell: ShellTool,
    web_fetch: WebFetchTool,
    memory: MemoryTool
  };

  // coreToolsが指定されている場合は、それだけを使用
  if (config?.coreTools && config.coreTools.length > 0) {
    const registry: Record<string, Tool> = {};
    for (const toolId of config.coreTools) {
      if (allTools[toolId]) {
        registry[toolId] = allTools[toolId];
      }
    }
    return registry;
  }

  // excludeToolsが指定されている場合は、それを除外
  if (config?.excludeTools && config.excludeTools.length > 0) {
    const registry: Record<string, Tool> = {};
    for (const [id, tool] of Object.entries(allTools)) {
      if (!config.excludeTools.includes(id)) {
        registry[id] = tool;
      }
    }
    return registry;
  }

  // デフォルトは全てのツールを返す
  return allTools;
}