import { v4 as uuidv4 } from 'uuid';

import { LLMProvider, LLMMessage, StreamEvent, ToolCall } from '../llm/types.js';
import { Tool } from '../tools/types.js';
import { Message } from '../types.js';
import { Logger } from '../utils/logger.js';

interface ChatOptions {
  provider: LLMProvider;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class Chat {
  private provider: LLMProvider;
  private model: string;
  private systemPrompt: string;
  private temperature: number;
  private maxTokens?: number;
  private messages: LLMMessage[] = [];
  private tools: Map<string, Tool> = new Map();
  private logger = Logger.getInstance();

  constructor(options: ChatOptions) {
    this.provider = options.provider;
    this.model = options.model || 'llama3';
    this.systemPrompt =
      options.systemPrompt || 'You are Tiger, a helpful coding assistant powered by a local LLM.';
    this.temperature = options.temperature ?? 0.7;
    this.maxTokens = options.maxTokens;

    // システムプロンプトを追加
    this.messages.push({
      role: 'system',
      content: this.systemPrompt,
    });
  }

  // ツールを登録
  registerTool(tool: Tool): void {
    this.tools.set(tool.schema.name, tool);
    this.logger.debug('Chat', 'Registered tool', { toolName: tool.schema.name });
  }

  // ユーザーメッセージを追加
  addUserMessage(content: string): void {
    this.messages.push({
      role: 'user',
      content,
    });
  }

  // チャット完了（非ストリーミング）
  async complete(): Promise<Message> {
    const tools = Array.from(this.tools.values()).map((tool) => tool.schema);

    const response = await this.provider.chatCompletion({
      model: this.model,
      messages: this.messages,
      tools: tools.length > 0 ? tools : undefined,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    });

    // ツール呼び出しがある場合は実行
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults = await this.executeTools(response.toolCalls);

      // アシスタントのレスポンスを追加
      this.messages.push({
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      });

      // ツール実行結果を追加
      for (const result of toolResults) {
        this.messages.push({
          role: 'tool',
          content: JSON.stringify(result.data),
          toolCallId: result.toolCallId,
        });
      }

      // ツール実行後の最終レスポンスを取得
      const finalResponse = await this.provider.chatCompletion({
        model: this.model,
        messages: this.messages,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      });

      this.messages.push({
        role: 'assistant',
        content: finalResponse.content,
      });

      return {
        id: uuidv4(),
        role: 'assistant',
        content: finalResponse.content,
        timestamp: new Date(),
      };
    }

    // アシスタントのレスポンスを追加
    this.messages.push({
      role: 'assistant',
      content: response.content,
    });

    return {
      id: uuidv4(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
    };
  }

  // チャット完了（ストリーミング）
  async *streamComplete(): AsyncGenerator<
    StreamEvent | { type: 'message'; message: Message },
    void,
    unknown
  > {
    const tools = Array.from(this.tools.values()).map((tool) => tool.schema);

    let content = '';
    const toolCalls: ToolCall[] = [];

    const stream = this.provider.streamChatCompletion({
      model: this.model,
      messages: this.messages,
      tools: tools.length > 0 ? tools : undefined,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content') {
        content += event.content;
        yield event;
      } else if (event.type === 'tool_call') {
        toolCalls.push(event.toolCall);
        yield event;
      } else if (event.type === 'done') {
        // ツール呼び出しがある場合は実行
        if (toolCalls.length > 0) {
          const toolResults = await this.executeTools(toolCalls);

          // アシスタントのレスポンスを追加
          this.messages.push({
            role: 'assistant',
            content,
            toolCalls,
          });

          // ツール実行結果を追加
          for (const result of toolResults) {
            this.messages.push({
              role: 'tool',
              content: JSON.stringify(result.data),
              toolCallId: result.toolCallId,
            });
          }

          // ツール実行後の最終レスポンスをストリーミング
          const finalStream = this.provider.streamChatCompletion({
            model: this.model,
            messages: this.messages,
            temperature: this.temperature,
            maxTokens: this.maxTokens,
            stream: true,
          });

          let finalContent = '';
          for await (const finalEvent of finalStream) {
            if (finalEvent.type === 'content') {
              finalContent += finalEvent.content;
              yield finalEvent;
            }
          }

          this.messages.push({
            role: 'assistant',
            content: finalContent,
          });

          yield {
            type: 'message',
            message: {
              id: uuidv4(),
              role: 'assistant',
              content: finalContent,
              timestamp: new Date(),
            },
          };
        } else {
          // アシスタントのレスポンスを追加
          this.messages.push({
            role: 'assistant',
            content,
          });

          yield {
            type: 'message',
            message: {
              id: uuidv4(),
              role: 'assistant',
              content,
              timestamp: new Date(),
            },
          };
        }

        yield event;
      } else {
        yield event;
      }
    }
  }

  // ツールを実行
  private async executeTools(
    toolCalls: ToolCall[],
  ): Promise<Array<{ toolCallId: string; data: unknown }>> {
    const results: Array<{ toolCallId: string; data: unknown }> = [];

    for (const toolCall of toolCalls) {
      const tool = this.tools.get(toolCall.name);
      if (!tool) {
        results.push({
          toolCallId: toolCall.id,
          data: { error: `Tool not found: ${toolCall.name}` },
        });
        continue;
      }

      // パラメータ検証
      if (!tool.validateParams(toolCall.arguments)) {
        results.push({
          toolCallId: toolCall.id,
          data: { error: `Invalid parameters for tool: ${toolCall.name}` },
        });
        continue;
      }

      try {
        this.logger.debug('Chat', 'Executing tool', {
          toolName: toolCall.name,
          arguments: toolCall.arguments,
        });

        // ツール実行
        const executeResult = tool.execute(toolCall.arguments);
        const data: unknown[] = [];

        for await (const result of executeResult) {
          data.push(result);
        }

        results.push({
          toolCallId: toolCall.id,
          data: data.length === 1 ? data[0] : data,
        });

        this.logger.debug('Chat', 'Tool execution completed', {
          toolName: toolCall.name,
          resultCount: data.length,
        });
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }

    return results;
  }

  // 現在のメッセージ履歴を取得
  getMessages(): LLMMessage[] {
    return [...this.messages];
  }

  // メッセージ履歴をクリア（システムプロンプトは保持）
  clearMessages(): void {
    this.messages = [this.messages[0]!];
  }
}
