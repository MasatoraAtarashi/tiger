import { spawn } from 'child_process';

import { Tool, ToolSchema } from './types.js';
import { ToolError, ErrorCode } from '../errors/index.js';

interface RunCommandParams {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
}

interface RunCommandResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export class RunCommandTool implements Tool<RunCommandParams, RunCommandResult> {
  private readonly safeCommands = [
    'ls', 'pwd', 'cat', 'echo', 'which', 'npm', 'node', 'git',
    'yarn', 'pnpm', 'npx', 'tsc', 'tsx', 'jest', 'vitest',
    'eslint', 'prettier', 'tree', 'find', 'grep', 'wc',
  ];

  schema: ToolSchema = {
    name: 'run_command',
    displayName: 'Run Command',
    description: 'Execute a shell command',
    parameters: [
      {
        name: 'command',
        type: 'string',
        description: 'The command to execute',
        required: true,
      },
      {
        name: 'args',
        type: 'array',
        description: 'Arguments to pass to the command',
        required: false,
        default: [],
      },
      {
        name: 'cwd',
        type: 'string',
        description: 'Working directory for the command',
        required: false,
      },
      {
        name: 'timeout',
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
        required: false,
        default: 30000,
      },
    ],
  };

  validateParams(params: RunCommandParams): boolean {
    return typeof params.command === 'string' && params.command.length > 0;
  }

  shouldConfirmExecute(params: RunCommandParams): boolean {
    // 安全なコマンドのリストに含まれている場合は確認不要
    const baseCommand = params.command.split('/').pop() || params.command;
    return !this.safeCommands.includes(baseCommand);
  }

  async *execute(params: RunCommandParams): AsyncGenerator<RunCommandResult, void, unknown> {
    const stdout: string[] = [];
    const stderr: string[] = [];
    let timedOut = false;

    try {
      const result = await new Promise<{ exitCode: number | null }>((resolve, reject) => {
        const child = spawn(params.command, params.args || [], {
          cwd: params.cwd,
          shell: true,
          env: { ...process.env },
        });

        // タイムアウト設定
        const timeout = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }, params.timeout || 30000);

        // stdout のキャプチャ
        child.stdout.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout.push(text);
          
          // リアルタイムでの出力（yield でストリーミング）
          // 将来的な拡張のためのプレースホルダー
        });

        // stderr のキャプチャ
        child.stderr.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr.push(text);
        });

        // エラーハンドリング
        child.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // プロセスの終了
        child.on('close', (code) => {
          clearTimeout(timeout);
          resolve({ exitCode: code });
        });
      });

      yield {
        command: `${params.command} ${(params.args || []).join(' ')}`.trim(),
        exitCode: result.exitCode,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
        timedOut,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new ToolError(
          ErrorCode.TOOL_TIMEOUT,
          `Command timed out: ${params.command}`,
          'runCommand',
          { command: params.command }
        );
      }
      throw new ToolError(
        ErrorCode.TOOL_EXECUTION_FAILED,
        `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'runCommand',
        { command: params.command },
        error as Error
      );
    }
  }
}