/**
 * Mock version of Tiger for testing without Ollama
 */

import { createToolRegistry } from './tools';
import { Logger } from './logger';

const availableTools = createToolRegistry();

// Mock function that simulates AI responses based on input
function getMockResponse(userInput: string): { tool?: string; args?: any; response: string } {
  const input = userInput.toLowerCase();
  
  if (input.includes('list') && (input.includes('file') || input.includes('directory'))) {
    // Check if a specific directory is mentioned
    const dirPatterns = [
      /list\s+files?\s+in\s+(\S+)/i,      // "list files in src/components"
      /list\s+(\S+)\s+directory/i,        // "list src/components directory"
      /files?\s+in\s+(\S+)/i              // "files in src/components"
    ];
    
    let path = '.';
    for (const pattern of dirPatterns) {
      const match = userInput.match(pattern);
      if (match && match[1] !== 'the' && match[1] !== 'current') {
        path = match[1];
        break;
      }
    }
    
    return {
      tool: 'ls',
      args: { path },
      response: `I'll list the files in ${path === '.' ? 'the current directory' : path} for you.`
    };
  }
  
  if (input.includes('read')) {
    // Handle different file patterns
    const filePatterns = [
      /read\s+(\S+\.\w+)/i,        // "read path/to/file.ext"
      /read\s+the\s+contents?\s+of\s+(\S+\.\w+)/i,  // "read the contents of file.ext"
      /(\S+\.\w+)/                 // Any file with extension
    ];
    
    let filename = 'file.txt';
    for (const pattern of filePatterns) {
      const match = userInput.match(pattern);
      if (match) {
        filename = match[1];
        break;
      }
    }
    
    return {
      tool: 'read_file',
      args: { path: filename },
      response: `I'll read the contents of ${filename} for you.`
    };
  }
  
  if (input.includes('create') && input.includes('file')) {
    // Handle different filename patterns
    const filenamePatterns = [
      /(?:called|named)\s+(\S+\.\w+)/,  // Match any file with extension
      /file\s+(\S+\.\w+)/,               // Match "file path/to/file.ext"
      /create\s+a?\s*file\s+(\S+\.\w+)/ // Match "create a file path/to/file.ext"
    ];
    
    let filename = 'output.txt';
    for (const pattern of filenamePatterns) {
      const match = userInput.match(pattern);
      if (match) {
        filename = match[1];
        break;
      }
    }
    
    // Try multiple patterns to capture content
    let content = 'Default content';
    const contentPatterns = [
      /content:\s*"([^"]+)"/i,
      /with the content:\s*"([^"]+)"/i,
      /with content:\s*"([^"]+)"/i,
      /content\s+"([^"]+)"/i,
      /with content\s+"([^"]+)"/i
    ];
    
    for (const pattern of contentPatterns) {
      const match = userInput.match(pattern);
      if (match) {
        content = match[1];
        break;
      }
    }
    
    return {
      tool: 'write_file',
      args: { path: filename, content },
      response: `I'll create ${filename} with the specified content.`
    };
  }
  
  if (input.includes('write') && input.includes('.txt')) {
    const filenameMatch = userInput.match(/to\s+(\w+\.txt)/);
    const contentMatch = userInput.match(/"([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : 'file.txt';
    const content = contentMatch ? contentMatch[1] : 'Content';
    return {
      tool: 'write_file',
      args: { path: filename, content },
      response: `I'll write that content to ${filename}.`
    };
  }
  
  if (input.includes('search') || input.includes('find')) {
    if (input.includes('console.log')) {
      return {
        tool: 'grep',
        args: { pattern: 'console\\.log', path: '.' },
        response: 'I\'ll search for console.log statements in your code.'
      };
    }
    if (input.includes('apikey')) {
      return {
        tool: 'grep',
        args: { pattern: 'apiKey', path: '.' },
        response: 'I\'ll search for apiKey occurrences in your files.'
      };
    }
    if (input.includes('.js') || input.includes('javascript')) {
      return {
        tool: 'glob',
        args: { pattern: '**/*.js' },
        response: 'I\'ll find all JavaScript files in the project.'
      };
    }
    if (input.includes('.ts') || input.includes('typescript')) {
      return {
        tool: 'glob',
        args: { pattern: 'src/**/*.ts' },
        response: 'I\'ll find all TypeScript files in the src directory.'
      };
    }
  }
  
  if (input.includes('run') || input.includes('execute') || input.includes('command')) {
    const commandMatch = userInput.match(/(?:command:|run|execute)\s*(.+)/);
    const command = commandMatch ? commandMatch[1].trim() : 'echo "Hello"';
    return {
      tool: 'shell',
      args: { command },
      response: `I'll execute the command: ${command}`
    };
  }
  
  return {
    response: 'I understand your request but I\'m not sure which tool to use. Could you be more specific?'
  };
}

export async function tigerChat(
  userInput: string,
  logger?: Logger,
  skipConfirmation: boolean = false
): Promise<{ response: string; logs: any[]; requiresConfirmation?: any }> {
  const logs: any[] = [];
  
  try {
    // Log thinking
    logs.push({ type: 'info', message: '🤔 Analyzing request...' });
    
    // Get mock response
    const mockResponse = getMockResponse(userInput);
    
    if (mockResponse.tool && mockResponse.args) {
      // Execute tool
      const tool = availableTools[mockResponse.tool];
      if (!tool) {
        throw new Error(`Tool ${mockResponse.tool} not found`);
      }
      
      logs.push({ type: 'tool', message: `🔧 Using tool: ${mockResponse.tool}` });
      logs.push({ type: 'exec', message: `⚡ Executing with args: ${JSON.stringify(mockResponse.args)}` });
      
      if (logger) {
        logger.log({
          timestamp: new Date().toISOString(),
          type: 'tool_execution',
          message: `Executing ${mockResponse.tool}`,
          metadata: { tool: mockResponse.tool, args: mockResponse.args }
        });
      }
      
      const result = await tool.execute(mockResponse.args);
      
      logs.push({ type: 'success', message: `✅ Tool executed successfully` });
      
      if (logger) {
        logger.log({
          timestamp: new Date().toISOString(),
          type: 'tool_result',
          message: `Tool ${mockResponse.tool} completed`,
          metadata: { result }
        });
      }
      
      // Format response with result
      let formattedResponse = mockResponse.response + '\n\n';
      if (mockResponse.tool === 'ls' && result.files) {
        formattedResponse += 'Files found:\n' + result.files.map((f: string) => `- ${f}`).join('\n');
      } else if (mockResponse.tool === 'read_file' && result.content) {
        formattedResponse += 'File content:\n```\n' + result.content + '\n```';
      } else if (mockResponse.tool === 'grep' && result.matches) {
        formattedResponse += 'Matches found:\n' + result.matches.map((m: any) => 
          `- ${m.file}:${m.line}: ${m.content}`
        ).join('\n');
      } else if (mockResponse.tool === 'glob' && result.files) {
        formattedResponse += 'Files found:\n' + result.files.map((f: string) => `- ${f}`).join('\n');
      } else if (mockResponse.tool === 'shell') {
        formattedResponse += 'Command output:\n```\n' + result.stdout + '\n```';
      }
      
      return {
        response: formattedResponse,
        logs
      };
    }
    
    // No tool needed
    return {
      response: mockResponse.response,
      logs
    };
    
  } catch (error: any) {
    logs.push({ type: 'error', message: `❌ Error: ${error.message}` });
    
    if (logger) {
      logger.log({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: error.message,
        metadata: { stack: error.stack }
      });
    }
    
    return {
      response: `I encountered an error: ${error.message}`,
      logs
    };
  }
}