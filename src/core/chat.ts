import { v4 as uuidv4 } from 'uuid';

import { LLMProvider, LLMMessage, StreamEvent, ToolCall } from '../llm/types.js';
import { Tool } from '../tools/types.js';
import { Message } from '../types.js';
import { Logger } from '../utils/logger.js';
import { ToolParser } from './tool-parser.js';

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
    let finalContent = '';
    let isFirstResponse = true;

    while (isFirstResponse || finalContent.includes('<tool_use>')) {
      isFirstResponse = false;
      
      const response = await this.provider.chatCompletion({
        model: this.model,
        messages: this.messages,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      });

      finalContent = response.content;
      const { toolCalls, contentWithoutTools } = ToolParser.parseToolCalls(finalContent);

      if (toolCalls.length > 0) {
        // アシスタントのレスポンスを追加
        this.messages.push({
          role: 'assistant',
          content: finalContent,
        });

        // ツールを実行
        for (const toolCall of toolCalls) {
          const tool = this.tools.get(toolCall.name);
          if (tool) {
            try {
              this.logger.debug('Chat', `Executing tool: ${toolCall.name}`, toolCall.args);
              const result = await tool.execute(toolCall.args);
              const toolResult = ToolParser.formatToolResult(toolCall.name, result);
              
              // ツール実行結果をユーザーメッセージとして追加
              this.messages.push({
                role: 'user',
                content: toolResult,
              });
            } catch (error) {
              const errorMsg = `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              this.logger.error('Chat', errorMsg);
              this.messages.push({
                role: 'user',
                content: errorMsg,
              });
            }
          } else {
            const errorMsg = `Tool not found: ${toolCall.name}`;
            this.messages.push({
              role: 'user',
              content: errorMsg,
            });
          }
        }
        // ツール実行後、次のレスポンスを生成するためにループを継続
        continue;
      } else {
        // ツール呼び出しがない場合は終了
        this.messages.push({
          role: 'assistant',
          content: contentWithoutTools || finalContent,
        });
        
        return {
          id: uuidv4(),
          role: 'assistant',
          content: contentWithoutTools || finalContent,
          timestamp: new Date(),
        };
      }
    }

    return {
      id: uuidv4(),
      role: 'assistant',
      content: finalContent,
      timestamp: new Date(),
    };
  }

  // チャット完了（ストリーミング）
  async *streamComplete(): AsyncGenerator<
    StreamEvent | { type: 'message'; message: Message },
    void,
    unknown
  > {
    let content = '';
    let isFirstResponse = true;

    while (isFirstResponse || content.includes('<tool_use>')) {
      isFirstResponse = false;
      content = '';
      
      const stream = this.provider.streamChatCompletion({
        model: this.model,
        messages: this.messages,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content') {
          content += event.content;
          yield event;
        } else if (event.type === 'done') {
          // LLMの応答からツール呼び出しをパース
          const { toolCalls, contentWithoutTools } = ToolParser.parseToolCalls(content);
          
          if (toolCalls.length > 0) {
            // アシスタントのレスポンスを追加（ツール呼び出し前のテキスト）
            this.messages.push({
              role: 'assistant',
              content: content,
            });
            
            // ツールを実行
            for (const toolCall of toolCalls) {
              const tool = this.tools.get(toolCall.name);
              if (tool) {
                try {
                  this.logger.debug('Chat', `Executing tool: ${toolCall.name}`, toolCall.args);
                  const result = await tool.execute(toolCall.args);
                  const toolResult = ToolParser.formatToolResult(toolCall.name, result);
                  
                  // ツール実行結果をユーザーメッセージとして追加
                  this.messages.push({
                    role: 'user',
                    content: toolResult,
                  });
                  
                  // ツール結果をストリーミングイベントとして送信
                  yield { type: 'content', content: `\n\n${toolResult}\n\n` };
                } catch (error) {
                  const errorMsg = `Error executing tool ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                  this.logger.error('Chat', errorMsg);
                  this.messages.push({
                    role: 'user',
                    content: errorMsg,
                  });
                  yield { type: 'content', content: `\n\n${errorMsg}\n\n` };
                }
              } else {
                const errorMsg = `Tool not found: ${toolCall.name}`;
                this.messages.push({
                  role: 'user',
                  content: errorMsg,
                });
                yield { type: 'content', content: `\n\n${errorMsg}\n\n` };
              }
            }
            
            // ツール実行後、次のレスポンスを生成するためにループを継続
            continue;
          } else {
            // ツール呼び出しがない場合は終了
            this.messages.push({
              role: 'assistant',
              content: contentWithoutTools || content,
            });
            yield event;
            break;
          }
        } else {
          yield event;
        }
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
