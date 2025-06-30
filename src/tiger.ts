import { createToolRegistry } from './tools';
import { Logger } from './logger';
import { loadConfig } from './config';
import { execSync } from 'child_process';

const availableTools = createToolRegistry();

// Ollamaを呼び出す関数
async function callOllama(prompt: string, logger?: Logger, model?: string): Promise<string> {
  const config = loadConfig();
  const modelName = model || config.model;
  
  try {
    const command = `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run ${modelName} 2>&1`;
    
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'ollama_call',
        message: `Calling Ollama with model ${modelName}`,
        metadata: { promptLength: prompt.length, model: modelName }
      });
    }
    
    let stdout: string;
    try {
      stdout = execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: config.timeout
      });
    } catch (error: any) {
      if (error.message.includes('ollama') || error.message.includes('not found') || error.code === 'ENOENT') {
        throw new Error('Ollama is not running. Please start Ollama first with: ollama serve');
      }
      throw error;
    }
    
    // ANSIエスケープシーケンスを除去し、プログレス表示を除外
    const cleanOutput = stdout.replace(/\[\?[0-9;]*[a-zA-Z]/g, '')
                             .replace(/\[([0-9]+)([A-K])/g, '')
                             .replace(/\r/g, '')
                             .split('\n')
                             .filter(line => !line.includes('pulling') && 
                                           !line.includes('verifying') &&
                                           !line.includes('[K') &&
                                           line.trim() !== '')
                             .join('\n')
                             .trim();
    
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'ollama_response',
        message: 'Received Ollama response',
        metadata: { 
          responseLength: cleanOutput.length,
          response: cleanOutput.substring(0, 500) + (cleanOutput.length > 500 ? '...' : '')
        }
      });
    }
    
    return cleanOutput;
  } catch (error: any) {
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: 'Ollama call failed',
        metadata: { error: error.message }
      });
    }
    throw error;
  }
}

// レスポンスからJSONを抽出
function extractJson(response: string): any {
  try {
    // 全体をJSONとしてパース
    const parsed = JSON.parse(response.trim());
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch {}
  
  // コードブロック内のJSONを探す
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {}
  }
  
  // JSONオブジェクトを探す
  const jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  
  return null;
}

// ツールを実行する
async function executeTool(toolName: string, args: any, logger?: Logger): Promise<any> {
  const tool = availableTools[toolName];
  if (!tool) {
    throw new Error(`Tool "${toolName}" not found`);
  }
  
  if (logger) {
    logger.log({
      timestamp: new Date().toISOString(),
      type: 'tool_execution',
      message: `Executing ${toolName}`,
      metadata: { tool: toolName, args }
    });
  }
  
  const result = await tool.execute(args);
  
  if (logger) {
    logger.log({
      timestamp: new Date().toISOString(),
      type: 'tool_result',
      message: `${toolName} completed`,
      metadata: { tool: toolName, success: true }
    });
  }
  
  return result;
}

interface ChatLog {
  type: 'info' | 'tool' | 'exec' | 'success' | 'error' | 'confirm';
  message: string;
}

interface ChatResult {
  response: string;
  logs: ChatLog[];
  requiresConfirmation?: {
    tool: string;
    args: any;
  };
  contextInfo?: {
    tokensUsed: number;
    promptLength: number;
  };
}

// 実行履歴
interface ExecutionStep {
  tool: string;
  args: any;
  result: any;
}

export async function tigerChat(
  userInput: string, 
  logger?: Logger,
  skipConfirmation: boolean = false
): Promise<ChatResult> {
  const config = loadConfig();
  const logs: ChatLog[] = [];
  const executionHistory: ExecutionStep[] = [];
  const maxIterations = config.maxIterations;
  
  logs.push({ type: 'info', message: '🤔 Thinking...' });
  
  let totalPromptLength = 0;
  
  // 実行ループ
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let prompt = `You are Tiger, a helpful coding assistant powered by Ollama and Mastra tools.

User request: ${userInput}

${executionHistory.length > 0 ? `
Previous actions taken:
${executionHistory.map((exec, idx) => 
  `${idx + 1}. ${exec.tool}(${JSON.stringify(exec.args)}) - Result: ${
    exec.tool === 'write_file' ? 'File created successfully' :
    exec.tool === 'read_file' ? `Read ${exec.result.content.length} characters` :
    exec.tool === 'ls' ? `Found ${exec.result.files.length} files` :
    exec.tool === 'run_command' ? 'Command executed' :
    'Completed'
  }`
).join('\n')}

Based on what you've done so far, what should you do next to complete the user's request?
` : ''}

Analyze this request and decide what action to take.
If you need to use a tool, respond with ONLY a JSON object like:
{"tool": "tool_name", "args": {"key": "value"}}

If the task is complete or you just need to provide information, respond with ONLY:
{"response": "your response here"}

Available tools:
- ls: List directory contents. Args: {"path": "./"}
- read_file: Read a file. Args: {"path": "file.txt"}
- write_file: Write content to a file. Args: {"path": "file.txt", "content": "content"}
- run_command: Execute a command. Args: {"command": "echo hello"}

IMPORTANT: 
1. Respond with ONLY JSON, nothing else.
2. For programming tasks, break them into steps: create file, implement code, test it.
3. Always complete the entire task before responding with a final message.`;
    
    totalPromptLength += prompt.length;
    
    let ollamaResponse: string;
    try {
      logs.push({ type: 'info', message: '🧠 Consulting with AI model...' });
      ollamaResponse = await callOllama(prompt, logger);
    } catch (error: any) {
      logs.push({ type: 'error', message: `Ollama error: ${error.message}` });
      return {
        response: error.message.includes('Ollama is not running') 
          ? error.message 
          : `Failed to connect to Ollama: ${error.message}`,
        logs
      };
    }
    
    logs.push({ type: 'info', message: '🔍 Parsing AI response...' });
    const parsed = extractJson(ollamaResponse);
    
    if (!parsed) {
      // JSONが抽出できない場合は、レスポンスをそのまま返す
      return {
        response: ollamaResponse || "I couldn't understand the response format. Please make sure Ollama is properly configured.",
        logs
      };
    }
    
    // レスポンスの場合（タスク完了）
    if (parsed.response) {
      logs.push({ type: 'success', message: '✅ Task completed' });
      return {
        response: parsed.response,
        logs,
        contextInfo: {
          tokensUsed: Math.floor(totalPromptLength / 4), // 簡易的なトークン推定
          promptLength: totalPromptLength
        }
      };
    }
    
    // ツールの実行
    if (parsed.tool && parsed.args) {
      logs.push({ type: 'info', message: '🎯 Identified required action...' });
      logs.push({ type: 'tool', message: `🔧 Selected tool: ${parsed.tool}` });
      
      // 確認が必要な場合
      if (!skipConfirmation && (parsed.tool === 'write_file' || parsed.tool === 'run_command')) {
        logs.push({ type: 'confirm', message: `⚠️ Tool execution requires confirmation: ${parsed.tool}` });
        return {
          response: 'Tool execution request',
          logs,
          requiresConfirmation: {
            tool: parsed.tool,
            args: parsed.args
          }
        };
      }
      
      // ツールを実行
      try {
        logs.push({ type: 'exec', message: `🚀 Executing ${parsed.tool}...` });
        const result = await executeTool(parsed.tool, parsed.args, logger);
        logs.push({ type: 'success', message: `✅ ${parsed.tool} completed successfully` });
        
        // 実行履歴に追加
        executionHistory.push({
          tool: parsed.tool,
          args: parsed.args,
          result: result
        });
        
        // 次のイテレーションに進む
        continue;
      } catch (error: any) {
        logs.push({ type: 'error', message: `❌ Tool error: ${error.message}` });
        return {
          response: `Error executing ${parsed.tool}: ${error.message}`,
          logs
        };
      }
    }
    
    // ツールもレスポンスもない場合
    logs.push({ type: 'error', message: 'Could not determine next action' });
    return {
      response: "I couldn't find the requested tool or understand the command.",
      logs
    };
  }
  
  // 最大イテレーション数に達した
  logs.push({ type: 'success', message: '✅ Task completed' });
  return {
    response: `Task completed. Performed ${executionHistory.length} actions: ${
      executionHistory.map(e => e.tool).join(', ')
    }`,
    logs,
    contextInfo: {
      tokensUsed: Math.floor(totalPromptLength / 4), // 簡易的なトークン推定
      promptLength: totalPromptLength
    }
  };
}