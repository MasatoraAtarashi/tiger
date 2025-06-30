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

async function testOllamaToolCall() {
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

  const userPrompt = "List the files in the current directory";
  
  const prompt = `${systemPrompt}

User: ${userPrompt}`;

  console.log('Testing Ollama tool call generation...\n');
  console.log('Prompt sent to Ollama:');
  console.log('---');
  console.log(prompt);
  console.log('---\n');
  
  try {
    // Ollamaに送信
    const command = `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run gemma3:4b`;
    const { stdout } = await execAsync(command);
    
    console.log('Ollama response:');
    console.log(stdout.trim());
    
    // JSONをパースしてみる
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const toolCall = JSON.parse(jsonMatch[0]);
        console.log('\nParsed tool call:', toolCall);
        
        // ツールが存在するか確認
        if (tools[toolCall.tool]) {
          console.log(`\n✓ Tool "${toolCall.tool}" found in registry`);
          console.log('Arguments:', toolCall.args);
        } else {
          console.log(`\n✗ Tool "${toolCall.tool}" not found in registry`);
        }
      } else {
        console.log('\n✗ No JSON found in response');
      }
    } catch (parseError) {
      console.log('\n✗ Failed to parse JSON from response');
    }
    
  } catch (error) {
    console.error('Error calling Ollama:', error);
  }
}

testOllamaToolCall().catch(console.error);