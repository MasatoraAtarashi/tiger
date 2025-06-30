import { exec } from 'child_process';
import { promisify } from 'util';
import { createToolRegistry } from './tools';
import { Logger } from './logger';

const execAsync = promisify(exec);

// Tiger用のシステムプロンプト（最終版）
const TIGER_SYSTEM_PROMPT = `You are Tiger, a powerful CLI coding agent. You help users by completing tasks using available tools.

Available tools:
{{TOOLS}}

Response format - Use ONLY ONE of these formats:

1. To use a tool:
{
  "tool": "tool_id",
  "args": { ... }
}

2. To provide a final answer (ONLY after completing all necessary actions):
{
  "answer": "Your complete response describing what was done"
}

CRITICAL RULES:
1. ALWAYS complete the ENTIRE task before giving a final answer
2. For "implement X" requests, you MUST:
   - Create the file(s)
   - Test/run them if applicable
   - Then provide a final answer
3. For "read/list" requests, after getting the data, provide a final answer with the information
4. Use the "complete" tool to summarize complex multi-step tasks before your final answer

Examples:

User: "Implement fibonacci in Python"
Step 1: {"tool": "write_file", "args": {"path": "fibonacci.py", "content": "..."}}
Step 2: {"tool": "shell", "args": {"command": "python fibonacci.py 10"}}
Step 3: {"tool": "complete", "args": {"task": "...", "summary": "...", "result": "success"}}
Step 4: {"answer": "I've created fibonacci.py with a recursive implementation..."}

User: "List files"  
Step 1: {"tool": "ls", "args": {"path": "."}}
Step 2: {"answer": "Here are the files in the current directory: ..."}`;

// ツール定義をプロンプト用に変換
function toolsToPrompt(tools: ReturnType<typeof createToolRegistry>): string {
  const toolDescriptions = Object.entries(tools).map(([id, tool]) => {
    const inputParams = Object.entries(tool.inputSchema.shape).map(([key, schema]: [string, any]) => {
      return `  - ${key}: ${schema.description || 'string'}`;
    }).join('\n');
    
    return `Tool: ${id}
Description: ${tool.description}
Parameters:
${inputParams}`;
  }).join('\n\n');
  
  return toolDescriptions;
}

// Ollamaにプロンプトを送信
async function callOllama(prompt: string, logger?: Logger): Promise<string> {
  const command = `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run gemma3:4b`;
  
  if (logger) {
    logger.log({
      timestamp: new Date().toISOString(),
      type: 'info',
      message: 'Calling Ollama with prompt',
      metadata: { promptLength: prompt.length }
    });
  }
  
  try {
    const { stdout, stderr } = await execAsync(command);
    
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'info',
        message: 'Ollama response received',
        metadata: { 
          responseLength: stdout.length,
          response: stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''),
          stderr: stderr || null
        }
      });
    }
    
    return stdout.trim();
  } catch (error: any) {
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: 'Ollama call failed',
        metadata: { 
          error: error.message,
          command: command.substring(0, 200) + '...',
          stderr: error.stderr,
          stdout: error.stdout
        }
      });
    }
    throw error;
  }
}

// レスポンスからJSONを抽出（改良版）
function extractJson(response: string): any {
  try {
    // まず全体をJSONとしてパースを試みる
    try {
      const parsed = JSON.parse(response.trim());
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch {}
    
    // コードブロック内のJSONを探す
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }
    
    // JSONオブジェクトを探す（改良版 - 入れ子に対応）
    const jsonMatch = response.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    
    // 複数行のJSONに対応
    const lines = response.split('\n');
    let jsonStr = '';
    let inJson = false;
    let braceCount = 0;
    
    for (const line of lines) {
      if (line.includes('{')) {
        inJson = true;
      }
      if (inJson) {
        jsonStr += line + '\n';
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        if (braceCount === 0 && jsonStr.trim()) {
          try {
            return JSON.parse(jsonStr.trim());
          } catch {
            jsonStr = '';
            inJson = false;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse JSON:', error);
  }
  return null;
}

// Tiger CLIのメイン関数（最終版）
export async function tigerChat(userInput: string, logger?: Logger, skipConfirmation: boolean = false): Promise<{
  response: string;
  logs: Array<{ type: string; message: string }>;
  requiresConfirmation?: {
    tool: string;
    args: any;
  };
}> {
  const logs: Array<{ type: string; message: string }> = [];
  const tools = createToolRegistry({
    excludeTools: ['plan_task', 'execute_plan', 'complete_step', 'get_plan_status']
  });
  
  const systemPrompt = TIGER_SYSTEM_PROMPT.replace('{{TOOLS}}', toolsToPrompt(tools));
  
  logs.push({ type: 'info', message: '🤔 Thinking...' });
  
  if (logger) {
    logger.logUserInput(userInput);
  }
  
  const executionHistory: Array<{
    tool: string;
    args: any;
    result: any;
  }> = [];
  
  const MAX_ITERATIONS = 8;
  let iterations = 0;
  let confirmationShown = false;
  
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    
    // プロンプトを構築
    let currentPrompt = systemPrompt + '\n\nUser request: "' + userInput + '"';
    
    if (executionHistory.length > 0) {
      currentPrompt += '\n\nActions taken so far:';
      executionHistory.forEach((exec, index) => {
        currentPrompt += `\n${index + 1}. ${exec.tool}`;
        
        // 重要な情報を抽出して表示
        if (exec.tool === 'write_file') {
          currentPrompt += ` - created ${exec.args.path}`;
        } else if (exec.tool === 'shell') {
          currentPrompt += ` - ran: ${exec.args.command}`;
          if (exec.result.stdout) {
            currentPrompt += `\n   Output: ${exec.result.stdout.substring(0, 100)}${exec.result.stdout.length > 100 ? '...' : ''}`;
          }
        } else if (exec.tool === 'read_file') {
          currentPrompt += ` - read ${exec.args.path}`;
          currentPrompt += `\n   Content preview: ${exec.result.content.substring(0, 100)}...`;
        } else if (exec.tool === 'ls') {
          currentPrompt += ` - listed ${exec.args.path || 'current directory'}`;
          currentPrompt += `\n   Files: ${exec.result.files.slice(0, 5).join(', ')}${exec.result.files.length > 5 ? '...' : ''}`;
        }
      });
      
      currentPrompt += '\n\nWhat should you do next? If the task is complete, provide a final answer summarizing what was done.';
    }
    
    let ollamaResponse: string;
    try {
      ollamaResponse = await callOllama(currentPrompt, logger);
    } catch (error: any) {
      logs.push({ type: 'error', message: `Ollama error: ${error.message}` });
      return {
        response: `Failed to connect to Ollama: ${error.message}`,
        logs
      };
    }
    
    const parsed = extractJson(ollamaResponse);
    
    if (!parsed) {
      if (executionHistory.length > 0) {
        logs.push({ type: 'success', message: '✅ Task completed' });
        return {
          response: ollamaResponse || "Task completed successfully.",
          logs
        };
      }
      return {
        response: "I couldn't understand how to help with that request. Please try rephrasing it.",
        logs
      };
    }
    
    // 最終回答の場合
    if (parsed.answer) {
      logs.push({ type: 'success', message: '✅ Task completed' });
      if (logger) {
        logger.logAssistantResponse(parsed.answer);
      }
      return {
        response: parsed.answer,
        logs
      };
    }
    
    // ツール呼び出しの場合
    if (parsed.tool && tools[parsed.tool]) {
      logs.push({ type: 'tool', message: `🔧 Using ${parsed.tool}` });
      
      // 初回のみ確認
      if (!skipConfirmation && !confirmationShown) {
        confirmationShown = true;
        return {
          response: `Tool execution request`,
          logs,
          requiresConfirmation: {
            tool: parsed.tool,
            args: parsed.args
          }
        };
      }
      
      try {
        const toolResult = await tools[parsed.tool].execute(parsed.args);
        logs.push({ type: 'success', message: '✅ Success' });
        
        if (logger) {
          logger.logToolExecution(parsed.tool, parsed.args, toolResult);
        }
        
        executionHistory.push({
          tool: parsed.tool,
          args: parsed.args,
          result: toolResult
        });
        
        continue;
      } catch (error: any) {
        logs.push({ type: 'error', message: `❌ Failed: ${error.message}` });
        if (logger) {
          logger.logError(error);
        }
        
        // エラーでも履歴に追加（エラー情報付き）
        executionHistory.push({
          tool: parsed.tool,
          args: parsed.args,
          result: { error: error.message }
        });
        
        // エラーがあっても続行を試みる
        continue;
      }
    } else {
      if (executionHistory.length > 0) {
        logs.push({ type: 'success', message: '✅ Task completed' });
        return {
          response: "Task completed. " + (ollamaResponse || "All requested actions have been performed."),
          logs
        };
      }
      return {
        response: "I couldn't find the requested tool or understand the command.",
        logs
      };
    }
  }
  
  logs.push({ type: 'warning', message: '⚠️ Maximum steps reached' });
  
  let summary = `Task partially completed after ${executionHistory.length} actions:\n`;
  executionHistory.forEach((exec, index) => {
    summary += `${index + 1}. ${exec.tool}`;
    if (exec.tool === 'write_file') {
      summary += ` - created ${exec.args.path}`;
    } else if (exec.tool === 'shell') {
      summary += ` - ran ${exec.args.command}`;
    }
    summary += '\n';
  });
  
  return {
    response: summary,
    logs
  };
}

// テスト用のメイン関数
async function main() {
  console.log('🐯 Tiger CLI Agent - Final Version\n');
  
  const testCases = [
    "Implement a Fibonacci calculator in Python",
    "List the files in the current directory",
    "What's in the package.json file?"
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 User: ${testCase}`);
    const result = await tigerChat(testCase, undefined, true);
    
    console.log('\n📊 Execution log:');
    result.logs.forEach(log => {
      console.log(`  ${log.message}`);
    });
    
    console.log(`\n🐯 Tiger: ${result.response}`);
    console.log('\n' + '='.repeat(80));
  }
}

if (require.main === module) {
  main().catch(console.error);
}