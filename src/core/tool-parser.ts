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
    const currentContent = content;
    let lastIndex = 0;
    
    // eslint-disable-next-line no-constant-condition
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
        // デバッグモードの場合のみエラーを表示
        if (process.env['TIGER_DEBUG'] === 'true') {
          console.error(`Failed to parse tool call for ${toolName}:`, error instanceof Error ? error.message : error);
          console.error('Raw args string:', argsStr);
        }
        // パースエラーは無視して続行（ストリーミング中の不完全なJSONの可能性があるため）
      }
      
      // 次の検索位置を更新
      const closePattern = '</tool_use>';
      let closeIndex = currentContent.indexOf(closePattern, jsonEnd);
      
      // </tool_use>が見つからない場合、次の<tool_use>または文字列の終端までを探す
      if (closeIndex === -1) {
        const nextToolStart = currentContent.indexOf('<tool_use>', jsonEnd);
        if (nextToolStart !== -1) {
          closeIndex = nextToolStart;
        } else {
          closeIndex = currentContent.length;
        }
      } else {
        closeIndex = closeIndex + closePattern.length;
      }
      
      lastIndex = closeIndex;
    }
    
    // ツール呼び出しを除いたコンテンツ
    let contentWithoutTools = content;
    // <tool_use>から</tool_use>まで、または次の<tool_use>までを削除
    contentWithoutTools = contentWithoutTools.replace(/<tool_use>[^<]*?(?:<\/tool_use>|(?=<tool_use>)|$)/g, '').trim();
    
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