import { LLMProvider, ChatCompletionOptions, ChatCompletionResponse, StreamEvent } from '../types.js';

interface MockResponse {
  pattern: RegExp;
  response: string;
}

export class MockProvider implements LLMProvider {
  name = 'mock';
  
  private mockResponses: MockResponse[] = [
    {
      pattern: /create.*file.*test\.py/i,
      response: 'I\'ll create a test.py file for you.\n\n<tool_use>write_file {"filePath": "test.py", "content": "# Test file created by Tiger\\nprint(\\"Hello from test.py\\")\\n"}</tool_use>\n\nI\'ve created test.py with a simple print statement.'
    },
    {
      pattern: /create.*file.*test-output\.txt.*Hello from E2E test/i,
      response: 'I\'ll create the test-output.txt file with the specified content.\n\n<tool_use>write_file {"filePath": "test-output.txt", "content": "Hello from E2E test"}</tool_use>\n\nThe file test-output.txt has been created with the content "Hello from E2E test".'
    },
    {
      pattern: /hello|test/i,
      response: 'Hello! I\'m Tiger, your helpful coding assistant. How can I help you today?'
    },
    {
      pattern: /exit|quit/i,
      response: 'Goodbye!'
    }
  ];

  async healthCheck(): Promise<boolean> {
    return await Promise.resolve(true);
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const lastMessage = options.messages[options.messages.length - 1];
    const userContent = lastMessage?.content || '';

    // Find matching mock response
    const mockResponse = this.mockResponses.find(mr => mr.pattern.test(userContent));
    const content = mockResponse?.response || 'I understand your request. How can I help you with that?';

    return await Promise.resolve({
      content,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    });
  }

  async *streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamEvent, void, unknown> {
    const response = await this.chatCompletion(options);
    
    // Simulate streaming by yielding content in chunks
    const words = response.content.split(' ');
    for (const word of words) {
      yield { type: 'content', content: word + ' ' };
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    yield { type: 'done' };
  }

  async listModels(): Promise<string[]> {
    return await Promise.resolve(['mock-model']);
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    // Simple mock embedding
    return await Promise.resolve(Array(384).fill(0.1) as number[]);
  }
}