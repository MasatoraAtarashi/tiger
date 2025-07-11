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

      // デバッグ用に生のレスポンスをログに記録
      if (logger) {
        logger.log({
          timestamp: new Date().toISOString(),
          type: 'debug',
          message: 'Raw Ollama output',
          metadata: {
            rawLength: stdout.length,
            // eslint-disable-next-line no-control-regex
            rawSample: stdout.substring(0, 200).replace(/[\x00-\x1F\x7F-\x9F]/g, '?')
          }
        });
      }
    } catch (error: any) {
      if (error.message.includes('ollama') || error.message.includes('not found') || error.code === 'ENOENT') {
        throw new Error('Ollama is not running. Please start Ollama first with: ollama serve');
      }
      throw error;
    }

    // ANSIエスケープシーケンスを除去
    let cleanOutput = stdout
    // 全てのESC文字を除去
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/\u001b/g, '')
    // 残りのANSIエスケープシーケンスを除去
      .replace(/\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/\[\?[0-9;]*[a-zA-Z]/g, '')
      .replace(/\[([0-9]+)([A-K])/g, '')
    // プログレスインジケーターを除去
      .replace(/⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/g, '')
      .replace(/\r/g, '\n')
    // 制御文字の後に続く可視文字以外を除去
      .replace(/\?[0-9;]*[a-zA-Z]/g, '');

    // JSONオブジェクトを抽出する
    const jsonMatch = cleanOutput.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      cleanOutput = jsonMatch[0];
    } else {
      // 改行で分割してフィルタリング
      cleanOutput = cleanOutput
        .split('\n')
        .filter(line => !line.includes('pulling') &&
                                  !line.includes('verifying') &&
                                  !line.includes('[K') &&
                                  line.trim() !== '' &&
                                  !line.match(/^\s*$/))
        .join('\n')
        .trim();
    }

    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'ollama_response',
        message: 'Received Ollama response',
        metadata: {
          originalLength: stdout.length,
          cleanedLength: cleanOutput.length,
          response: cleanOutput.substring(0, 500) + (cleanOutput.length > 500 ? '...' : ''),
          firstLine: cleanOutput.split('\n')[0] || 'EMPTY'
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
  } catch {
    // JSONパースエラーは無視
  }

  // コードブロック内のJSONを探す
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
    // JSONパースエラーは無視
    }
  }

  // JSONオブジェクトを探す
  const jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
    // JSONパースエラーは無視
    }
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
  skipConfirmation: boolean = false,
  memory?: string
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
${memory ? `\nProject Context:\n${memory}\n` : ''}
User request: ${userInput}

${executionHistory.length > 0 ? `
Previous actions taken:
${executionHistory.map((exec, idx) =>
    `${idx + 1}. ${exec.tool}(${JSON.stringify(exec.args)}) - Result: ${
      exec.tool === 'write_file' ? 'File created successfully' :
        exec.tool === 'read_file' ? `Read ${exec.result.content.length} characters` :
          exec.tool === 'ls' ? `Found ${exec.result.files.length} files` :
            exec.tool === 'shell' ? 'Command executed' :
              'Completed'
    }`
  ).join('\n')}

Based on what you've done so far, what should you do next to complete the user's request?
` : ''}

Analyze this request and decide what action to take.
You MUST respond with ONLY ONE of these JSON formats:

1. To use a tool:
{"tool": "tool_name", "args": {"key": "value"}}

2. When task is complete:
{"response": "your final response here"}

Remember: Output ONLY valid JSON, nothing else.

Available tools:
- ls: List directory contents. Example: {"tool": "ls", "args": {"path": "./"}}
- read_file: Read a file content. Example: {"tool": "read_file", "args": {"path": "file.txt"}}
- write_file: Write/create a file. Example: {"tool": "write_file", "args": {"path": "file.txt", "content": "file content here"}}
- shell: Execute shell commands. Example: {"tool": "shell", "args": {"command": "echo hello"}}

IMPORTANT: 
1. Respond with ONLY JSON, nothing else.
2. For programming tasks, break them into steps: create file, implement code, test it.
3. Always complete the entire task before responding with a final message.
4. When creating summaries or documents, include actual content, not just titles.
5. Think step by step and ensure your outputs are complete and useful.`;

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

    // デバッグ: パース結果をログに記録
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'debug',
        message: 'JSON parse result',
        metadata: {
          parsed: parsed,
          ollamaResponse: ollamaResponse.substring(0, 200)
        }
      });
    }

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
      if (!skipConfirmation && (parsed.tool === 'write_file' || parsed.tool === 'shell')) {
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