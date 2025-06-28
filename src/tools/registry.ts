import { ReadFileTool } from './readFile.js';
import { Tool, ToolRegistry, ToolSchema } from './types.js';

export class DefaultToolRegistry implements ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // デフォルトツールの登録
    this.register(new ReadFileTool());
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