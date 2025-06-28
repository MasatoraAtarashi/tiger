export interface ParsedToolCall {
  name: string;
  args: Record<string, unknown>;
}

export class ToolParser {
  // <tool_use>tool_name {"arg": "value"}</tool_use> 形式をパース
  static parseToolCalls(content: string): { 
    toolCalls: ParsedToolCall[]; 
    contentWithoutTools: string;
  } {
    const toolCalls: ParsedToolCall[] = [];
    const toolRegex = /<tool_use>(\w+)\s*({[^}]+})<\/tool_use>/g;
    let match;
    
    while ((match = toolRegex.exec(content)) !== null) {
      try {
        const name = match[1];
        const argsStr = match[2];
        const args = JSON.parse(argsStr);
        toolCalls.push({ name, args });
      } catch (error) {
        console.error('Failed to parse tool call:', error);
      }
    }
    
    // ツール呼び出しを除いたコンテンツ
    const contentWithoutTools = content.replace(toolRegex, '').trim();
    
    return { toolCalls, contentWithoutTools };
  }
  
  // ツール実行結果をフォーマット
  static formatToolResult(toolName: string, result: unknown): string {
    return `<tool_result>
Tool: ${toolName}
Result: ${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
</tool_result>`;
  }
}