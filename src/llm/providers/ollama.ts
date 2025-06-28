import { Logger } from '../../utils/logger.js';
import {
  ChatCompletionOptions,
  ChatCompletionResponse,
  LLMMessage,
  LLMProvider,
  StreamEvent,
} from '../types.js';

interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeout?: number;
}

interface OllamaMessage {
  role: string;
  content: string;
  tool_calls?: Array<{
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  done: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
}

export class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private config: OllamaConfig;
  private logger = Logger.getInstance();
  private readonly DEFAULT_TIMEOUT = 30000; // 30秒のデフォルトタイムアウト

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      defaultModel: config.defaultModel || 'llama3',
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
    };

    this.logger.debug('OllamaProvider', 'Initialized', { config: this.config });
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.logger.error('OllamaProvider', 'Request timeout', { url, timeout: this.config.timeout });
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = (await response.json()) as { models: Array<{ name: string }> };
      return data.models.map((model) => model.name);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to Ollama: ${error.message}`);
      }
      throw error;
    }
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    this.logger.debug('OllamaProvider', 'Chat completion request', {
      model: options.model || this.config.defaultModel,
      messageCount: options.messages.length,
      temperature: options.temperature,
      hasTools: !!options.tools,
    });

    const messages = this.convertMessages(options.messages);
    const tools = options.tools?.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.reduce(
            (acc, param) => {
              acc[param.name] = {
                type: param.type,
                description: param.description,
              };
              return acc;
            },
            {} as Record<string, unknown>,
          ),
          required: tool.parameters.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        messages,
        tools,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaStreamResponse;

    const toolCalls = data.message?.tool_calls?.map((tc, index) => ({
      id: `call_${index}`,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }));

    const response_result = {
      content: data.message?.content || '',
      toolCalls,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };

    this.logger.debug('OllamaProvider', 'Chat completion response', {
      duration: Date.now() - startTime,
      tokenCount: response_result.usage.totalTokens,
      hasToolCalls: !!toolCalls && toolCalls.length > 0,
    });

    return response_result;
  }

  async *streamChatCompletion(
    options: ChatCompletionOptions,
  ): AsyncGenerator<StreamEvent, void, unknown> {
    this.logger.debug('OllamaProvider', 'Starting stream chat completion', {
      model: options.model || this.config.defaultModel,
      messageCount: options.messages.length,
    });

    const messages = this.convertMessages(options.messages);
    const tools = options.tools?.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.reduce(
            (acc, param) => {
              acc[param.name] = {
                type: param.type,
                description: param.description,
              };
              return acc;
            },
            {} as Record<string, unknown>,
          ),
          required: tool.parameters.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        messages,
        tools,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
        stream: true,
      }),
    });

    if (!response.ok) {
      yield { type: 'error', error: new Error(`Ollama API error: ${response.statusText}`) };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: new Error('No response body') };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let messageCount = 0;
    const startTime = Date.now();

    try {
      this.logger.debug('OllamaProvider', 'Stream reader started');
      
      while (true) {
        const result = await reader.read();
        if (result.done) {
          this.logger.debug('OllamaProvider', 'Stream reader done', {
            duration: Date.now() - startTime,
            messageCount,
          });
          break;
        }

        buffer += decoder.decode(result.value as Uint8Array, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            messageCount++;
            try {
              const data = JSON.parse(line) as OllamaStreamResponse;
              
              if (messageCount % 10 === 0) {
                this.logger.debug('OllamaProvider', 'Stream progress', {
                  messageCount,
                  done: data.done,
                });
              }

              if (data.message?.content) {
                yield { type: 'content', content: data.message.content };
              }

              if (data.message?.tool_calls) {
                for (const [index, tc] of data.message.tool_calls.entries()) {
                  const toolCall = tc as { function: { name: string; arguments: string } };
                  yield {
                    type: 'tool_call',
                    toolCall: {
                      id: `call_${index}`,
                      name: toolCall.function.name,
                      arguments: JSON.parse(toolCall.function.arguments) as Record<string, unknown>,
                    },
                  };
                }
              }

              if (data.done) {
                this.logger.debug('OllamaProvider', 'Stream complete signal received');
                yield { type: 'done' };
              }
            } catch (error) {
              this.logger.error('OllamaProvider', 'Failed to parse streaming response', {
                error: error instanceof Error ? error.message : 'Unknown error',
                line,
              });
              // パースエラーはスキップして続行
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('OllamaProvider', 'Stream processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        messageCount,
      });
      yield { type: 'error', error: error instanceof Error ? error : new Error('Unknown streaming error') };
    } finally {
      reader.releaseLock();
      this.logger.debug('OllamaProvider', 'Stream reader released');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private convertMessages(messages: LLMMessage[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role === 'tool' ? 'assistant' : msg.role,
      content: msg.content,
      tool_calls: msg.toolCalls?.map((tc) => ({
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      })),
    }));
  }
}
