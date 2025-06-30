import { exec } from 'child_process';
import { promisify } from 'util';
import { createToolRegistry } from './tools';

const execAsync = promisify(exec);

// ツール定義をOllamaプロンプト用に変換
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

// Ollamaにプロンプトを送信してレスポンスを取得
async function callOllama(prompt: string): Promise<string> {
  const command = `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run gemma3:4b`;
  const { stdout } = await execAsync(command);
  return stdout.trim();
}

// JSONレスポンスからツール呼び出しを抽出
function extractToolCall(response: string): { tool: string; args: any } | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to parse tool call:', error);
  }
  return null;
}

async function testOllamaExecuteTool() {
  const tools = createToolRegistry({ coreTools: ['ls', 'read_file', 'shell'] });
  const toolsPrompt = toolsToPrompt(tools);

  const systemPrompt = `You are a helpful assistant that can use tools.
Available tools:
${toolsPrompt}

When you need to use a tool, respond ONLY with a JSON object in this format:
{
  "tool": "tool_id",
  "args": {
    "param1": "value1",
    "param2": "value2"
  }
}

IMPORTANT: Respond ONLY with the JSON object, no additional text.`;

  console.log('Testing Ollama → Tool Execution Pipeline...\n');

  // テストケース1: ディレクトリリスト
  console.log('Test 1: List files in current directory');
  console.log('User: List the files in the current directory');

  const prompt1 = `${systemPrompt}\n\nUser: List the files in the current directory`;
  const response1 = await callOllama(prompt1);
  console.log('Ollama response:', response1);

  const toolCall1 = extractToolCall(response1);
  if (toolCall1 && tools[toolCall1.tool]) {
    console.log('Executing tool:', toolCall1);
    const result = await tools[toolCall1.tool].execute(toolCall1.args);
    console.log('Tool result:', result);
  }

  console.log('\n---\n');

  // テストケース2: ファイル読み込み
  console.log('Test 2: Read package.json file');
  console.log('User: Read the contents of package.json');

  const prompt2 = `${systemPrompt}\n\nUser: Read the contents of package.json`;
  const response2 = await callOllama(prompt2);
  console.log('Ollama response:', response2);

  const toolCall2 = extractToolCall(response2);
  if (toolCall2 && tools[toolCall2.tool]) {
    console.log('Executing tool:', toolCall2);
    try {
      const result = await tools[toolCall2.tool].execute(toolCall2.args);
      console.log('Tool result (first 200 chars):',
        JSON.stringify(result).substring(0, 200) + '...');
    } catch (error) {
      console.error('Tool execution error:', error);
    }
  }

  console.log('\n---\n');

  // テストケース3: シェルコマンド実行
  console.log('Test 3: Execute shell command');
  console.log('User: Show me the current date');

  const prompt3 = `${systemPrompt}\n\nUser: Show me the current date using the date command`;
  const response3 = await callOllama(prompt3);
  console.log('Ollama response:', response3);

  const toolCall3 = extractToolCall(response3);
  if (toolCall3 && tools[toolCall3.tool]) {
    console.log('Executing tool:', toolCall3);
    const result = await tools[toolCall3.tool].execute(toolCall3.args);
    console.log('Tool result:', result);
  }
}

testOllamaExecuteTool().catch(console.error);