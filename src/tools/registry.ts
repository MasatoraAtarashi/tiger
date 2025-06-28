import { EditFileTool } from './editFile.js';
import { GlobTool } from './glob.js';
import { GrepTool } from './grep.js';
import { ListDirectoryTool } from './listDirectory.js';
import { ReadFileTool } from './readFile.js';
import { ReadManyFilesTool } from './readManyFiles.js';
import { RunCommandTool } from './runCommand.js';
import { Tool, ToolRegistry, ToolSchema } from './types.js';
import { WriteFileTool } from './writeFile.js';

export class DefaultToolRegistry implements ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // デフォルトツールの登録
    this.register(new ReadFileTool());
    this.register(new WriteFileTool());
    this.register(new EditFileTool());
    this.register(new ListDirectoryTool());
    this.register(new RunCommandTool());
    this.register(new GrepTool());
    this.register(new GlobTool());
    this.register(new ReadManyFilesTool());
  }

  register(tool: Tool): void {
    this.tools.set(tool.schema.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolSchema[] {
    return Array.from(this.tools.values()).map((tool) => tool.schema);
  }
}

// シングルトンインスタンス
export const toolRegistry = new DefaultToolRegistry();
