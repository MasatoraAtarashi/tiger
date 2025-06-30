import { exec } from 'child_process';
import { promisify } from 'util';
import { createToolRegistry } from './tools';
import { Logger } from './logger';

const execAsync = promisify(exec);

// Tiger用のシステムプロンプト
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

When providing a final answer, respond with:
{
  "answer": "Your response to the user"
}

IMPORTANT RULES:
1. For complex tasks (like implementing programs), ALWAYS use the "plan_task" tool first to create a comprehensive plan.
2. After creating a plan, use "execute_plan" to get the next step, then execute that step with the appropriate tool.
3. After executing each step, use "complete_step" to mark it as done, then "execute_plan" again for the next step.
4. Continue until all steps are completed.
5. When all steps are done, use the "complete" tool to report the final result.
6. Be helpful and thorough - complete the ENTIRE task, don't stop after just one step.
7. Continue executing tools until the task is complete or you provide a final answer.

Example workflow for "implement Fibonacci":
1. Use plan_task to create steps: write file, test it, report completion
2. Use execute_plan to get step 1 (write file)
3. Use write_file tool
4. Use complete_step to mark step 1 done
5. Use execute_plan to get step 2 (test)
6. Use shell tool to run the program
7. Use complete_step to mark step 2 done
8. Use complete tool to report final result`;

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

interface ConversationContext {
  userInput: string;
  toolExecutions: Array<{
    tool: string;
    args: any;
    result: any;
  }>;
}

// Tiger CLIのメイン関数（改良版）
export async function tigerChat(userInput: string, logger?: Logger, skipConfirmation: boolean = false): Promise<{
  response: string;
  logs: Array<{ type: string; message: string }>;
  requiresConfirmation?: {
    tool: string;
    args: any;
  };
}> {
  const logs: Array<{ type: string; message: string }> = [];
  const tools = createToolRegistry();
  
  // システムプロンプトを生成
  const systemPrompt = TIGER_SYSTEM_PROMPT.replace('{{TOOLS}}', toolsToPrompt(tools));
  
  logs.push({ type: 'info', message: '🤔 Thinking...' });
  
  // ユーザー入力を分析
  if (userInput.toLowerCase().includes('file') || userInput.toLowerCase().includes('read')) {
    logs.push({ type: 'info', message: '📂 Analyzing file operation request...' });
  } else if (userInput.toLowerCase().includes('run') || userInput.toLowerCase().includes('command')) {
    logs.push({ type: 'info', message: '⚡ Analyzing command execution request...' });
  } else if (userInput.toLowerCase().includes('create') || userInput.toLowerCase().includes('write')) {
    logs.push({ type: 'info', message: '✏️ Analyzing creation request...' });
  }
  
  if (logger) {
    logger.logUserInput(userInput);
  }
  
  // 会話コンテキストを初期化
  const context: ConversationContext = {
    userInput,
    toolExecutions: []
  };
  
  // 最大実行回数（無限ループ防止）
  const MAX_ITERATIONS = 20;
  let iterations = 0;
  
  // タスクが完了するまでループ
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    logs.push({ type: 'info', message: `🧠 Processing step ${iterations}...` });
    
    // プロンプトを構築
    let currentPrompt = `${systemPrompt}\n\nUser: ${userInput}`;
    
    // 過去のツール実行結果を追加
    if (context.toolExecutions.length > 0) {
      currentPrompt += '\n\nPrevious tool executions:';
      context.toolExecutions.forEach((exec, index) => {
        currentPrompt += `\n${index + 1}. Tool: ${exec.tool}, Result: ${JSON.stringify(exec.result)}`;
      });
      currentPrompt += '\n\nBased on these results, what should we do next? Continue with the next step or provide a final answer.';
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
    
    logs.push({ type: 'info', message: '🔍 Parsing AI response...' });
    
    const parsed = extractJson(ollamaResponse);
    
    if (!parsed) {
      return {
        response: "I'm sorry, I couldn't understand the response format.",
        logs
      };
    }
    
    // 通常の回答の場合（タスク完了）
    if (parsed.answer) {
      logs.push({ type: 'info', message: '💭 Formulating response...' });
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
      logs.push({ type: 'info', message: '🎯 Identified required action...' });
      logs.push({ type: 'tool', message: `🔧 Selected tool: ${parsed.tool}` });
      
      // ユーザー確認が必要な場合（最初のツール実行時のみ）
      if (!skipConfirmation && context.toolExecutions.length === 0) {
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
      
      logs.push({ type: 'info', message: '🔄 Preparing tool execution...' });
      logs.push({ type: 'exec', message: `⚡ Executing with args: ${JSON.stringify(parsed.args)}` });
      
      try {
        const toolResult = await tools[parsed.tool].execute(parsed.args);
        logs.push({ type: 'success', message: '✅ Tool executed successfully' });
        
        if (logger) {
          logger.logToolExecution(parsed.tool, parsed.args, toolResult);
        }
        
        // 実行結果をコンテキストに追加
        context.toolExecutions.push({
          tool: parsed.tool,
          args: parsed.args,
          result: toolResult
        });
        
        logs.push({ type: 'info', message: '📊 Processing tool results...' });
        
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
      return {
        response: "I couldn't determine how to proceed with the task.",
        logs
      };
    }
  }
  
  // 最大実行回数に達した場合
  logs.push({ type: 'warning', message: '⚠️ Maximum iterations reached' });
  return {
    response: `Task execution stopped after ${MAX_ITERATIONS} steps. The task may be incomplete.`,
    logs
  };
}

// テスト用のメイン関数
async function main() {
  console.log('🐯 Tiger CLI Agent - Test Mode (v2)\n');
  
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