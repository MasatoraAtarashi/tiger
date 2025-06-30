import { exec } from 'child_process';
import { promisify } from 'util';
import { createToolRegistry } from './tools';
import { Logger } from './logger';

const execAsync = promisify(exec);

// Tiger用のシステムプロンプト（シンプル版）
const TIGER_SYSTEM_PROMPT = `You are Tiger, a powerful CLI coding agent that can help users with various tasks using available tools.

Available tools:
{{TOOLS}}

When you need to use a tool, respond with a JSON object in this format:
{
  "tool": "tool_id",
  "args": {
    "param1": "value1"
  }
}

You can also include a "next_action" field to indicate what you plan to do after this tool executes:
{
  "tool": "tool_id",
  "args": { ... },
  "next_action": "description of what to do next"
}

When providing a final answer, respond with:
{
  "answer": "Your response to the user"
}

IMPORTANT RULES:
1. Complete the ENTIRE task, not just the first step.
2. For complex tasks like "implement Fibonacci", you should:
   - First use write_file to create the program
   - Then use shell to test it
   - Finally use complete to report what you did
3. After each tool execution, think about what needs to be done next.
4. Continue working until the task is fully complete.
5. When you're done, provide a clear final answer summarizing what was accomplished.

Example for "implement Fibonacci calculator":
Step 1: write_file to create fibonacci.py
Step 2: shell to run "python fibonacci.py" and test it
Step 3: complete to report the full task completion
Step 4: answer with a summary of what was done`;

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

// レスポンスからJSONを抽出
function extractJson(response: string): any {
  try {
    // コードブロック内のJSONを探す（```json ... ```）
    const codeBlockMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1]);
    }
    
    // 最後に現れるJSON形式のオブジェクトを探す（複数のJSONがある場合）
    const jsonMatches = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      // 最後のJSONオブジェクトを使用（通常、これがツール呼び出しまたは最終回答）
      const lastJson = jsonMatches[jsonMatches.length - 1];
      try {
        return JSON.parse(lastJson);
      } catch (e) {
        // 最後のJSONが無効な場合、すべてのJSONを試す
        for (let i = jsonMatches.length - 2; i >= 0; i--) {
          try {
            return JSON.parse(jsonMatches[i]);
          } catch {}
        }
        throw e; // すべて失敗したら元のエラーを投げる
      }
    }
  } catch (error) {
    console.error('Failed to parse JSON:', error);
  }
  return null;
}

// Tiger CLIのメイン関数（シンプル版）
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
    // タスクプランニングツールを除外
    excludeTools: ['plan_task', 'execute_plan', 'complete_step', 'get_plan_status']
  });
  
  // システムプロンプトを生成
  const systemPrompt = TIGER_SYSTEM_PROMPT.replace('{{TOOLS}}', toolsToPrompt(tools));
  
  logs.push({ type: 'info', message: '🤔 Thinking...' });
  
  // ユーザー入力を分析
  if (userInput.toLowerCase().includes('file') || userInput.toLowerCase().includes('read')) {
    logs.push({ type: 'info', message: '📂 Analyzing file operation request...' });
  } else if (userInput.toLowerCase().includes('run') || userInput.toLowerCase().includes('command')) {
    logs.push({ type: 'info', message: '⚡ Analyzing command execution request...' });
  } else if (userInput.toLowerCase().includes('create') || userInput.toLowerCase().includes('write') || 
             userInput.toLowerCase().includes('implement') || userInput.toLowerCase().includes('作')) {
    logs.push({ type: 'info', message: '✏️ Analyzing creation request...' });
  }
  
  if (logger) {
    logger.logUserInput(userInput);
  }
  
  // 実行履歴を保持
  const executionHistory: Array<{
    tool: string;
    args: any;
    result: any;
  }> = [];
  
  // 最大実行回数（無限ループ防止）
  const MAX_ITERATIONS = 10;
  let iterations = 0;
  let confirmationShown = false;
  
  // タスクが完了するまでループ
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    logs.push({ type: 'info', message: `🧠 Step ${iterations}...` });
    
    // プロンプトを構築
    let currentPrompt = `${systemPrompt}\n\nUser request: ${userInput}`;
    
    // 過去の実行履歴を追加
    if (executionHistory.length > 0) {
      currentPrompt += '\n\nPrevious actions taken:';
      executionHistory.forEach((exec, index) => {
        currentPrompt += `\n${index + 1}. Tool: ${exec.tool}`;
        if (exec.tool === 'write_file') {
          currentPrompt += `, created/updated: ${exec.args.path}`;
        } else if (exec.tool === 'shell') {
          currentPrompt += `, command: ${exec.args.command}`;
        }
        currentPrompt += `\nResult: ${JSON.stringify(exec.result).substring(0, 200)}${JSON.stringify(exec.result).length > 200 ? '...' : ''}`;
      });
      currentPrompt += '\n\nBased on what you\'ve done so far, what should you do next to complete the user\'s request? If the task is complete, provide a final answer.';
    }
    
    // Ollamaに送信
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
    
    logs.push({ type: 'info', message: '🔍 Parsing response...' });
    
    const parsed = extractJson(ollamaResponse);
    
    if (!parsed) {
      // JSONが見つからない場合は、プレーンテキストの応答として扱う
      if (executionHistory.length > 0) {
        // 既に何かアクションを取っている場合は、それを最終回答とする
        logs.push({ type: 'success', message: '✅ Task completed' });
        return {
          response: ollamaResponse,
          logs
        };
      }
      return {
        response: "I'm sorry, I couldn't understand how to help with that request.",
        logs
      };
    }
    
    // 通常の回答の場合（タスク完了）
    if (parsed.answer) {
      logs.push({ type: 'info', message: '💭 Final answer ready...' });
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
      logs.push({ type: 'tool', message: `🔧 Using tool: ${parsed.tool}` });
      
      // ユーザー確認が必要な場合（最初のツール実行時のみ）
      if (!skipConfirmation && !confirmationShown) {
        confirmationShown = true;
        logs.push({ type: 'confirm', message: `⚠️ Tool execution requires confirmation: ${parsed.tool}` });
        return {
          response: `Tool execution request`,
          logs,
          requiresConfirmation: {
            tool: parsed.tool,
            args: parsed.args
          }
        };
      }
      
      logs.push({ type: 'exec', message: `⚡ Executing: ${JSON.stringify(parsed.args).substring(0, 100)}${JSON.stringify(parsed.args).length > 100 ? '...' : ''}` });
      
      try {
        const toolResult = await tools[parsed.tool].execute(parsed.args);
        logs.push({ type: 'success', message: '✅ Success' });
        
        if (logger) {
          logger.logToolExecution(parsed.tool, parsed.args, toolResult);
        }
        
        // 実行履歴に追加
        executionHistory.push({
          tool: parsed.tool,
          args: parsed.args,
          result: toolResult
        });
        
        // next_actionがある場合はログに表示
        if (parsed.next_action) {
          logs.push({ type: 'info', message: `📋 Next: ${parsed.next_action}` });
        }
        
        // 次のステップに続く
        continue;
      } catch (error) {
        logs.push({ type: 'error', message: `❌ Tool execution failed: ${error}` });
        if (logger) {
          logger.logError(error);
        }
        return {
          response: `Failed to execute tool: ${error}`,
          logs
        };
      }
    } else {
      // ツールが見つからない、または不正な応答
      if (executionHistory.length > 0) {
        // 既に何かアクションを取っている場合
        logs.push({ type: 'success', message: '✅ Task completed' });
        return {
          response: "Task completed. " + (ollamaResponse || "All requested actions have been performed."),
          logs
        };
      }
      return {
        response: "I couldn't determine how to help with that request.",
        logs
      };
    }
  }
  
  // 最大実行回数に達した場合
  logs.push({ type: 'warning', message: '⚠️ Maximum steps reached' });
  
  // 実行内容をまとめる
  let summary = `I've completed ${executionHistory.length} actions:\n`;
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
  console.log('🐯 Tiger CLI Agent - Test Mode (v3)\n');
  
  const testCases = [
    "Implement a Fibonacci calculator in Python",
    "List the files in the current directory",
    "What's in the package.json file?"
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 User: ${testCase}`);
    const result = await tigerChat(testCase, undefined, true); // Skip confirmation for testing
    
    console.log('\n📊 Logs:');
    result.logs.forEach(log => {
      console.log(`  ${log.message}`);
    });
    
    console.log(`\n🐯 Tiger: ${result.response}`);
    console.log('\n' + '='.repeat(80));
  }
}

// コマンドライン実行の場合
if (require.main === module) {
  main().catch(console.error);
}