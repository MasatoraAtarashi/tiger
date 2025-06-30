import { MemoryManager } from './memory';
import { Logger } from './logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

export interface SlashCommand {
  name: string;
  description: string;
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  currentDir: string;
  memoryManager: MemoryManager;
  logger?: Logger;
  config?: any;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  action?: 'exit' | 'clear' | 'continue';
  data?: any;
}

export class SlashCommandManager {
  private commands: Map<string, SlashCommand> = new Map();
  private customCommands: Map<string, string> = new Map();

  constructor() {
    this.registerBuiltinCommands();
  }

  private registerBuiltinCommands(): void {
    // Basic commands
    this.register({
      name: 'help',
      description: 'Show available commands',
      handler: async () => ({
        success: true,
        message: this.getHelpText()
      })
    });

    this.register({
      name: 'clear',
      description: 'Clear the conversation',
      handler: async () => ({
        success: true,
        action: 'clear'
      })
    });

    this.register({
      name: 'quit',
      description: 'Exit Tiger',
      handler: async () => ({
        success: true,
        action: 'exit'
      })
    });

    // Memory commands
    this.register({
      name: 'memory',
      description: 'Edit memory files',
      handler: async (args, context) => {
        const editor = process.env.EDITOR || 'vim';
        const memoryType = args[0] || 'project';

        let memoryPath: string;
        if (memoryType === 'user') {
          memoryPath = path.join(homedir(), '.tiger', 'TIGER.md');
          await fs.mkdir(path.dirname(memoryPath), { recursive: true });
        } else {
          memoryPath = path.join(context.currentDir, 'TIGER.md');
        }

        // Ensure file exists
        try {
          await fs.access(memoryPath);
        } catch {
          await fs.writeFile(memoryPath, '# Tiger Memory\n\n', 'utf-8');
        }

        try {
          execSync(`${editor} "${memoryPath}"`, { stdio: 'inherit' });
          await context.memoryManager.loadMemories(context.currentDir);
          return { success: true, message: 'Memory updated' };
        } catch (error: any) {
          return { success: false, message: `Failed to edit memory: ${error.message}` };
        }
      }
    });

    this.register({
      name: 'init',
      description: 'Initialize project memory',
      handler: async (args, context) => {
        await context.memoryManager.initProjectMemory(context.currentDir);
        return { success: true, message: 'Project memory initialized' };
      }
    });

    // Status commands
    this.register({
      name: 'status',
      description: 'Show current status',
      handler: async (args, context) => {
        const memories = await this.getMemoryStatus(context);
        const model = context.config?.model || 'unknown';

        return {
          success: true,
          message: `🐯 Tiger Status
Model: ${model}
Working Directory: ${context.currentDir}
${memories}`
        };
      }
    });

    this.register({
      name: 'model',
      description: 'Show or change the model',
      handler: async (args, context) => {
        if (args.length === 0) {
          return {
            success: true,
            message: `Current model: ${context.config?.model || 'unknown'}`
          };
        }

        // To change model, we'd need to update config
        return {
          success: false,
          message: 'Model switching not yet implemented'
        };
      }
    });
  }

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  async loadCustomCommands(projectDir: string): Promise<void> {
    const paths = [
      path.join(homedir(), '.tiger', 'commands'),
      path.join(projectDir, '.tiger', 'commands')
    ];

    for (const commandsPath of paths) {
      try {
        const files = await fs.readdir(commandsPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const name = file.slice(0, -3);
            const content = await fs.readFile(path.join(commandsPath, file), 'utf-8');
            this.customCommands.set(name, content);
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }
  }

  async execute(commandLine: string, context: CommandContext): Promise<CommandResult> {
    const [commandName, ...args] = commandLine.slice(1).split(/\s+/);

    // Check built-in commands
    const command = this.commands.get(commandName);
    if (command) {
      return command.handler(args, context);
    }

    // Check custom commands
    const customContent = this.customCommands.get(commandName);
    if (customContent) {
      return {
        success: true,
        message: 'Custom command execution not yet implemented',
        data: { content: customContent }
      };
    }

    return {
      success: false,
      message: `Unknown command: ${commandName}. Type /help for available commands.`
    };
  }

  isSlashCommand(input: string): boolean {
    return input.startsWith('/');
  }

  private getHelpText(): string {
    const builtinCommands = Array.from(this.commands.entries())
      .map(([name, cmd]) => `  /${name} - ${cmd.description}`)
      .join('\n');

    const customCommandsList = Array.from(this.customCommands.keys())
      .map(name => `  /${name} (custom)`)
      .join('\n');

    return `🐯 Tiger Commands

Built-in Commands:
${builtinCommands}
${customCommandsList ? '\nCustom Commands:\n' + customCommandsList : ''}`;
  }

  private async getMemoryStatus(context: CommandContext): Promise<string> {
    const userMemoryPath = path.join(homedir(), '.tiger', 'TIGER.md');
    const projectMemoryPath = path.join(context.currentDir, 'TIGER.md');

    const memories: string[] = [];

    try {
      await fs.access(userMemoryPath);
      memories.push('✓ User memory');
    } catch {
      memories.push('✗ User memory');
    }

    try {
      await fs.access(projectMemoryPath);
      memories.push('✓ Project memory');
    } catch {
      memories.push('✗ Project memory');
    }

    return 'Memory Files:\n' + memories.join('\n');
  }
}