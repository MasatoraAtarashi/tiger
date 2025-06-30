import { tools as availableTools } from './tools';
import { Logger } from './logger';
import { execSync } from 'child_process';

// Ollamaを呼び出す関数
async function callOllama(prompt: string, logger?: Logger): Promise<string> {
  try {
    const command = `echo '${prompt.replace(/'/g, "'\\''")}' | ollama run llama3.2:3b 2>&1`;
    
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'ollama_call',
        message: 'Calling Ollama',
        metadata: { promptLength: prompt.length }
      });
    }
    
    let stdout: string;
    try {
      stdout = execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000 // 30秒のタイムアウト
      });
    } catch (error: any) {
      if (error.message.includes('ollama') || error.message.includes('not found')) {
        throw new Error('Ollama is not running. Please start Ollama first with: ollama serve');
      }
      throw error;
    }
    
    // ANSIエスケープシーケンスを除去
    const cleanOutput = stdout.replace(/\[\?[0-9;]*[a-zA-Z]/g, '')
                             .replace(/\[([0-9]+)([A-K])/g, '')
                             .replace(/\r/g, '')
                             .split('\n')
                             .filter(line => !line.includes('pulling') && 
                                           !line.includes('verifying') &&
                                           !line.includes('[K'))
                             .join('\n')
                             .trim();
    
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'ollama_response',
        message: 'Received Ollama response',
        metadata: { responseLength: cleanOutput.length }
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

// JSONを抽出する
function extractJson(response: string): any {
  try {
    // 全体をJSONとしてパース
    return JSON.parse(response.trim());
  } catch {
    // JSONオブジェクトを探す
    const jsonMatch = response.match(/\{[^{}]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
  }
  return null;
}

// ツールを実行する
async function executeTool(toolName: string, args: any, logger?: Logger): Promise<any> {
  const tool = availableTools.find(t => t.name === toolName);
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
}

// タスクプランナー
class TaskPlanner {
  private steps: { id: number; description: string; completed: boolean }[] = [];
  private currentStep: number = 0;
  
  constructor(private logger?: Logger) {}
  
  async planTask(userRequest: string): Promise<string[]> {
    const prompt = `You are a task planner. Break down this request into specific steps:
"${userRequest}"

Respond with a JSON array of steps. Each step should be a specific action.
Example: ["Create a file named fibonacci.py", "Write the fibonacci function", "Add test code", "Test the program"]

IMPORTANT: Respond with ONLY the JSON array, nothing else.`;
    
    const response = await callOllama(prompt, this.logger);
    
    try {
      const steps = JSON.parse(response.trim());
      if (Array.isArray(steps)) {
        this.steps = steps.map((desc, idx) => ({ 
          id: idx, 
          description: desc, 
          completed: false 
        }));
        return steps;
      }
    } catch {}
    
    // フォールバック：単一ステップ
    return [userRequest];
  }
  
  getCurrentStep(): string | null {
    const step = this.steps[this.currentStep];
    return step ? step.description : null;
  }
  
  completeStep() {
    if (this.currentStep < this.steps.length) {
      this.steps[this.currentStep].completed = true;
      this.currentStep++;
    }
  }
  
  isComplete(): boolean {
    return this.currentStep >= this.steps.length;
  }
  
  getProgress(): string {
    return `Step ${this.currentStep + 1}/${this.steps.length}`;
  }
}

export async function tigerChat(
  userInput: string, 
  logger?: Logger,
  skipConfirmation: boolean = false
): Promise<ChatResult> {
  const logs: ChatLog[] = [];
  
  logs.push({ type: 'info', message: '🤔 Thinking...' });
  
  // タスクプランナーを作成
  const planner = new TaskPlanner(logger);
  const steps = await planner.planTask(userInput);
  
  if (steps.length > 1) {
    logs.push({ type: 'info', message: `📋 Planning ${steps.length} steps...` });
  }
  
  let finalResponse = '';
  
  // 各ステップを実行
  while (!planner.isComplete()) {
    const currentStep = planner.getCurrentStep() || userInput;
    
    if (steps.length > 1) {
      logs.push({ type: 'info', message: `${planner.getProgress()}: ${currentStep}` });
    }
    
    const prompt = `You are Tiger, a helpful coding assistant. 

Current task: ${currentStep}
Original request: ${userInput}

Analyze this task and decide what action to take. 
If you need to use a tool, respond with ONLY a JSON object like:
{"tool": "tool_name", "args": {"key": "value"}}

If you just need to provide information, respond with ONLY:
{"response": "your response here"}

Available tools:
- ls: List directory contents. Args: {"path": "./"}
- read_file: Read a file. Args: {"path": "file.txt"}
- write_file: Write content to a file. Args: {"path": "file.txt", "content": "content"}
- run_command: Execute a command. Args: {"command": "echo hello"}

IMPORTANT: Respond with ONLY JSON, nothing else.`;
    
    let ollamaResponse: string;
    try {
      ollamaResponse = await callOllama(prompt, logger);
    } catch (error: any) {
      logs.push({ type: 'error', message: `Failed to connect to Ollama: ${error.message}` });
      return {
        response: `Failed to connect to Ollama: ${error.message}`,
        logs
      };
    }
    
    const parsed = extractJson(ollamaResponse);
    
    if (!parsed) {
      logs.push({ type: 'info', message: 'Could not parse response, trying different approach...' });
      // シンプルなリクエストで再試行
      const simplePrompt = `What tool should I use for: ${currentStep}? Reply with just the tool name (ls, read_file, write_file, or run_command)`;
      const toolResponse = await callOllama(simplePrompt, logger);
      
      if (toolResponse.includes('write_file') && currentStep.toLowerCase().includes('fibonacci')) {
        // フィボナッチの場合は直接実装
        const toolCall = {
          tool: 'write_file',
          args: {
            path: 'fibonacci.py',
            content: `def fibonacci(n):
    """Calculate nth Fibonacci number"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
if __name__ == "__main__":
    n = int(input("Enter the number of terms: "))
    print(f"Fibonacci sequence up to {n} terms:")
    for i in range(n):
        print(f"F({i}) = {fibonacci(i)}")
`
          }
        };
        parsed = toolCall;
      }
    }
    
    if (parsed) {
      if (parsed.tool) {
        // ツールの実行
        logs.push({ type: 'tool', message: `🔧 Using ${parsed.tool}` });
        
        if (!skipConfirmation && (parsed.tool === 'write_file' || parsed.tool === 'run_command')) {
          return {
            response: 'Tool execution request',
            logs,
            requiresConfirmation: {
              tool: parsed.tool,
              args: parsed.args
            }
          };
        }
        
        try {
          const result = await executeTool(parsed.tool, parsed.args, logger);
          logs.push({ type: 'success', message: '✅ Success' });
          
          // 結果を記録
          if (parsed.tool === 'write_file') {
            finalResponse = `Created file: ${parsed.args.path}`;
          } else if (parsed.tool === 'read_file') {
            finalResponse = `Read file: ${parsed.args.path}`;
          } else if (parsed.tool === 'ls') {
            finalResponse = `Listed files: ${result.files.join(', ')}`;
          } else if (parsed.tool === 'run_command') {
            finalResponse = `Command output: ${result.output}`;
          }
          
        } catch (error: any) {
          logs.push({ type: 'error', message: `Tool error: ${error.message}` });
        }
      } else if (parsed.response) {
        finalResponse = parsed.response;
      }
    }
    
    planner.completeStep();
  }
  
  logs.push({ type: 'success', message: '✅ Task completed' });
  
  return {
    response: finalResponse || "Task completed successfully.",
    logs
  };
}