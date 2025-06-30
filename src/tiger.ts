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
1. Always use tools when possible to provide accurate information.
2. When you complete a task (like creating files, running commands, or modifying code), ALWAYS use the "complete" tool to report what you did.
3. Be helpful and concise.
4. Track all files you modify and commands you execute for the complete tool report.`;

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
      return JSON.parse(lastJson);
    }
  } catch (error) {
    console.error('Failed to parse JSON:', error);
  }
  return null;
}

// Tiger CLIのメイン関数
export async function tigerChat(userInput: string, logger?: Logger): Promise<{
  response: string;
  logs: Array<{ type: string; message: string }>;
}> {
  const logs: Array<{ type: string; message: string }> = [];
  const tools = createToolRegistry();
  
  // システムプロンプトを生成
  const systemPrompt = TIGER_SYSTEM_PROMPT.replace('{{TOOLS}}', toolsToPrompt(tools));
  const fullPrompt = `${systemPrompt}\n\nUser: ${userInput}`;
  
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
  
  logs.push({ type: 'info', message: '🧠 Consulting with AI model...' });
  
  // Ollamaに送信
  let ollamaResponse: string;
  try {
    ollamaResponse = await callOllama(fullPrompt, logger);
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
  
  // 通常の回答の場合
  if (parsed.answer) {
    logs.push({ type: 'info', message: '💭 Formulating response...' });
    logs.push({ type: 'success', message: '✅ Response ready' });
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
    logs.push({ type: 'info', message: '🔄 Preparing tool execution...' });
    logs.push({ type: 'exec', message: `⚡ Executing with args: ${JSON.stringify(parsed.args)}` });
    
    try {
      const toolResult = await tools[parsed.tool].execute(parsed.args);
      logs.push({ type: 'success', message: '✅ Tool executed successfully' });
      
      if (logger) {
        logger.logToolExecution(parsed.tool, parsed.args, toolResult);
      }
      
      logs.push({ type: 'info', message: '📊 Processing tool results...' });
      logs.push({ type: 'info', message: '🤖 Generating final response...' });
      
      // ツール結果を含めて再度LLMに問い合わせ
      const resultPrompt = `${systemPrompt}

User: ${userInput}
Tool ${parsed.tool} was executed with result: ${JSON.stringify(toolResult)}

Please provide a final answer based on this result.`;
      
      let finalResponse: string;
      try {
        finalResponse = await callOllama(resultPrompt, logger);
      } catch (error: any) {
        logs.push({ type: 'error', message: `Ollama error on final response: ${error.message}` });
        return {
          response: `Tool executed but failed to get final response: ${error.message}`,
          logs
        };
      }
      
      const finalParsed = extractJson(finalResponse);
      
      if (finalParsed && finalParsed.answer) {
        if (logger) {
          logger.logAssistantResponse(finalParsed.answer);
        }
        return {
          response: finalParsed.answer,
          logs
        };
      } else {
        const fallbackResponse = `Tool executed successfully. Result: ${JSON.stringify(toolResult)}`;
        if (logger) {
          logger.logAssistantResponse(fallbackResponse);
        }
        return {
          response: fallbackResponse,
          logs
        };
      }
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
  }
  
  return {
    response: "I couldn't determine how to help with that request.",
    logs
  };
}

// テスト用のメイン関数
async function main() {
  console.log('🐯 Tiger CLI Agent - Test Mode\n');
  
  const testCases = [
    "List the files in the current directory",
    "What's in the package.json file?",
    "Show me the current date"
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 User: ${testCase}`);
    const result = await tigerChat(testCase);
    
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