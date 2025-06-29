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

IMPORTANT: Always use tools when possible to provide accurate information. Be helpful and concise.`;

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
async function callOllama(prompt: string): Promise<string> {
  const command = `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run gemma3:4b`;
  const { stdout } = await execAsync(command);
  return stdout.trim();
}

// レスポンスからJSONを抽出
function extractJson(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
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
  
  if (logger) {
    logger.logUserInput(userInput);
  }
  
  // Ollamaに送信
  const ollamaResponse = await callOllama(fullPrompt);
  const parsed = extractJson(ollamaResponse);
  
  if (!parsed) {
    return {
      response: "I'm sorry, I couldn't understand the response format.",
      logs
    };
  }
  
  // 通常の回答の場合
  if (parsed.answer) {
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
    logs.push({ type: 'tool', message: `🔧 Selected tool: ${parsed.tool}` });
    logs.push({ type: 'exec', message: `⚡ Executing with args: ${JSON.stringify(parsed.args)}` });
    
    try {
      const toolResult = await tools[parsed.tool].execute(parsed.args);
      logs.push({ type: 'success', message: '✅ Tool executed successfully' });
      
      if (logger) {
        logger.logToolExecution(parsed.tool, parsed.args, toolResult);
      }
      
      // ツール結果を含めて再度LLMに問い合わせ
      const resultPrompt = `${systemPrompt}

User: ${userInput}
Tool ${parsed.tool} was executed with result: ${JSON.stringify(toolResult)}

Please provide a final answer based on this result.`;
      
      const finalResponse = await callOllama(resultPrompt);
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