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
    let currentContent = content;
    let lastIndex = 0;
    
    while (true) {
      // <tool_use>を探す
      const startPattern = '<tool_use>';
      const startIndex = currentContent.indexOf(startPattern, lastIndex);
      if (startIndex === -1) break;
      
      // ツール名を取得
      const nameStart = startIndex + startPattern.length;
      const nameEnd = currentContent.indexOf(' ', nameStart);
      if (nameEnd === -1) break;
      
      const toolName = currentContent.substring(nameStart, nameEnd);
      
      // 引数のJSONを取得
      const argsStart = nameEnd + 1;
      
      // JSONの終了位置を探す（ネストされた括弧に対応）
      let braceCount = 0;
      let jsonEnd = argsStart;
      let inString = false;
      let escapeNext = false;
      
      for (let i = argsStart; i < currentContent.length; i++) {
        const char = currentContent[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }
      }
      
      // JSONをパース
      const argsStr = currentContent.substring(argsStart, jsonEnd);
      try {
        let fixedArgs = argsStr.trim();
        
        // JSONが完全でない場合、末尾まで読む
        if (fixedArgs.startsWith('{') && !fixedArgs.endsWith('}')) {
          // </tool_use>タグまでの間にあるすべてのテキストを取得
          const endTagIndex = currentContent.indexOf('</tool_use>', argsStart);
          if (endTagIndex > argsStart) {
            fixedArgs = currentContent.substring(argsStart, endTagIndex).trim();
          }
          
          // それでも閉じ括弧が足りない場合は追加
          if (!fixedArgs.endsWith('}')) {
            const openBraces = (fixedArgs.match(/{/g) || []).length;
            const closeBraces = (fixedArgs.match(/}/g) || []).length;
            fixedArgs += '}'.repeat(openBraces - closeBraces);
          }
        }
        
        const args = JSON.parse(fixedArgs) as Record<string, unknown>;
        toolCalls.push({ name: toolName, args });
      } catch (error) {
        // より詳細なエラー情報を提供
        console.error(`Failed to parse tool call for ${toolName}:`, error instanceof Error ? error.message : error);
        console.error('Raw args string:', argsStr);
      }
      
      // 次の検索位置を更新
      const closePattern = '</tool_use>';
      const closeIndex = currentContent.indexOf(closePattern, jsonEnd);
      lastIndex = closeIndex !== -1 ? closeIndex + closePattern.length : jsonEnd;
    }
    
    // ツール呼び出しを除いたコンテンツ
    let contentWithoutTools = content;
    for (const toolCall of toolCalls) {
      const toolPattern = new RegExp(`<tool_use>${toolCall.name}\\s*{[^<]*}?(?:</tool_use>)?`, 'g');
      contentWithoutTools = contentWithoutTools.replace(toolPattern, '');
    }
    
    return { toolCalls, contentWithoutTools: contentWithoutTools.trim() };
  }
  
  // ツール実行結果をフォーマット
  static formatToolResult(toolName: string, result: unknown): string {
    return `<tool_result>
Tool: ${toolName}
Result: ${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
</tool_result>`;
  }
}